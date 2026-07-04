import "server-only";

import { PRODUCT_NAME } from "@/lib/brand/config";
import type { BotPlatform } from "@/lib/meetings/meeting-url";
import { logStructured } from "@/lib/logging/structured";
import {
  getMeetingParticipants,
  getRunningBots,
  getTranscript,
  getVexaMeeting,
  listVexaMeetings,
  type VexaMeeting,
  type VexaMeetingParticipantsResponse,
  type VexaTranscriptSegment,
} from "@/lib/vexa/client";

/** Tempo de espera após sala vazia (sem humanos) antes de encerrar o bot. */
export const EMPTY_ROOM_GRACE_MS = 3 * 60_000;
/** Janela de tolerância enquanto o bot ainda está entrando (evita falso "completed"). */
export const JOINING_GRACE_MS = 3 * 60_000;
/** Tempo máximo em lobby/entrada antes de marcar falha. */
export const JOINING_TIMEOUT_MS = 15 * 60_000;
/** Tempo mínimo no lobby vazio antes de desistir da entrada. */
export const EMPTY_LOBBY_MIN_MS = 60_000;

const JOINING_STATUSES = new Set(["requested", "joining", "awaiting_admission"]);
const CAPTURING_STATUSES = new Set(["active", "stopping"]);

const BOT_PARTICIPANT_PATTERNS = [
  new RegExp(`^${PRODUCT_NAME}`, "i"),
  /\bbot\b/i,
  /notetaker/i,
  /recall/i,
  /vexa/i,
];

/** Nome de participante que provavelmente é o próprio bot (não humano). */
export function isLikelyBotParticipant(name: string | null | undefined): boolean {
  const trimmed = name?.trim();
  if (!trimmed) return false;
  return BOT_PARTICIPANT_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/** Conta participantes humanos, excluindo o bot quando a API o inclui na contagem. */
export function countHumanParticipants(
  response: VexaMeetingParticipantsResponse
): number {
  const participants = response.participants ?? [];
  if (participants.length > 0) {
    return participants.filter((participant) => !isLikelyBotParticipant(participant.name)).length;
  }

  // Sem lista detalhada: assume que participant_count pode incluir o bot.
  return Math.max(0, response.participant_count - 1);
}

export function getLastTranscriptActivityMs(segments: VexaTranscriptSegment[]): number | null {
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index];
    if (segment.absolute_end_time) return new Date(segment.absolute_end_time).getTime();
    if (segment.absolute_start_time) return new Date(segment.absolute_start_time).getTime();
  }
  return null;
}

/** Última fala humana na transcrição — ignora segmentos atribuídos ao bot. */
export function getLastHumanTranscriptActivityMs(
  segments: VexaTranscriptSegment[]
): number | null {
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index];
    if (isLikelyBotParticipant(segment.speaker)) continue;
    if (segment.absolute_end_time) return new Date(segment.absolute_end_time).getTime();
    if (segment.absolute_start_time) return new Date(segment.absolute_start_time).getTime();
  }
  return null;
}

export type RunningBotRef = {
  platform: BotPlatform;
  nativeMeetingId: string;
  containerUp: boolean;
};

function meetingKey(platform: string, nativeMeetingId: string): string {
  return `${platform}:${nativeMeetingId}`;
}

/** Índice de reuniões Vexa por plataforma + ID nativo. */
export async function getVexaMeetingsByNativeId(): Promise<Map<string, VexaMeeting>> {
  const meetings = await listVexaMeetings();
  const map = new Map<string, VexaMeeting>();
  for (const meeting of meetings) {
    map.set(meetingKey(meeting.platform, meeting.native_meeting_id), meeting);
  }
  return map;
}

/** Índice de containers de bot em execução. */
export async function getRunningBotsByNativeId(): Promise<Map<string, RunningBotRef>> {
  const running = await getRunningBots();
  const map = new Map<string, RunningBotRef>();
  for (const bot of running) {
    const containerUp =
      bot.normalized_status === "Up" ||
      (typeof bot.status === "string" && bot.status.toLowerCase().startsWith("up"));
    map.set(meetingKey(bot.platform, bot.native_meeting_id), {
      platform: bot.platform,
      nativeMeetingId: bot.native_meeting_id,
      containerUp,
    });
  }
  return map;
}

export function isJoiningVexaStatus(status: string): boolean {
  return JOINING_STATUSES.has(status);
}

export function isCapturingVexaStatus(status: string): boolean {
  return CAPTURING_STATUSES.has(status);
}

/**
 * Quando o container do bot já caiu, `/meetings` pode continuar retornando `active`
 * por alguns segundos — tratamos como encerrado para não deixar a UI presa em "gravando".
 */
export function reconcileVexaLifecycleStatus(
  lifecycleStatus: string | null | undefined,
  containerUp: boolean,
  elapsedMs: number
): string | null {
  if (!lifecycleStatus || containerUp) return lifecycleStatus ?? null;

  if (isCapturingVexaStatus(lifecycleStatus)) {
    return "completed";
  }

  if (isJoiningVexaStatus(lifecycleStatus) && elapsedMs >= JOINING_GRACE_MS) {
    return "completed";
  }

  return lifecycleStatus;
}

/**
 * Resolve o status real da reunião no Vexa.
 * `/bots/status` retorna uptime do container ("Up 4 seconds"), não o ciclo de vida
 * (`active`, `joining`, etc.) — por isso usamos `/meetings` e fallbacks.
 */
export function resolveVexaMeetingStatus(input: {
  vexaMeeting?: VexaMeeting | null;
  container?: RunningBotRef | null;
  dbStatus: string;
  meetingStartedAt: string;
  hasTranscriptSegments?: boolean;
}): string {
  const elapsedMs = Date.now() - new Date(input.meetingStartedAt).getTime();

  if (input.dbStatus === "bot_joining" && elapsedMs >= JOINING_TIMEOUT_MS) {
    return "failed";
  }

  const containerUp = Boolean(input.container?.containerUp);

  if (input.vexaMeeting?.status) {
    return (
      reconcileVexaLifecycleStatus(input.vexaMeeting.status, containerUp, elapsedMs) ??
      input.vexaMeeting.status
    );
  }

  if (input.hasTranscriptSegments) {
    return reconcileVexaLifecycleStatus("active", containerUp, elapsedMs) ?? "active";
  }

  if (input.container?.containerUp) {
    if (input.dbStatus === "recording") return "active";
    if (elapsedMs < JOINING_GRACE_MS) return "joining";
    // Container up além da grace sem registro em /meetings — provável lobby ou sync atrasado.
    return "joining";
  }

  if (input.dbStatus === "bot_joining" && elapsedMs < JOINING_GRACE_MS) {
    return "joining";
  }

  return "completed";
}

/**
 * Refina o status inferido consultando /meetings diretamente e a transcrição.
 * Usado pelo poll e pela API de sessão quando a listagem agregada não tem a reunião.
 */
export async function refineVexaMeetingStatus(
  platform: BotPlatform,
  nativeMeetingId: string,
  coarseStatus: string,
  containerUp = false,
  elapsedMs = 0
): Promise<string> {
  if (isCapturingVexaStatus(coarseStatus) || coarseStatus === "failed" || coarseStatus === "completed") {
    return coarseStatus;
  }

  try {
    const direct = await getVexaMeeting(platform, nativeMeetingId);
    if (direct?.status) {
      return (
        reconcileVexaLifecycleStatus(direct.status, containerUp, elapsedMs) ?? direct.status
      );
    }
  } catch {
    // segue para fallback de transcrição
  }

  if (isJoiningVexaStatus(coarseStatus) || coarseStatus === "joining") {
    try {
      const transcript = await getTranscript(platform, nativeMeetingId);
      if ((transcript.segments?.length ?? 0) > 0) {
        return reconcileVexaLifecycleStatus("active", containerUp, elapsedMs) ?? "active";
      }
    } catch {
      // mantém status coarse
    }
  }

  return coarseStatus;
}

/**
 * Detecta reunião vazia: bot ainda ativo ou no lobby, mas sem participantes.
 * Fallback quando o Vexa não dispara auto-leave sozinho.
 */
export async function shouldAutoLeaveEmptyMeeting(
  platform: BotPlatform,
  nativeMeetingId: string,
  vexaStatus: string,
  meetingStartedAt: string
): Promise<boolean> {
  const inLobby = isJoiningVexaStatus(vexaStatus);
  if (!isCapturingVexaStatus(vexaStatus) && !inLobby) return false;

  const activeForMs = Date.now() - new Date(meetingStartedAt).getTime();
  if (inLobby && activeForMs < EMPTY_LOBBY_MIN_MS) return false;

  try {
    const participants = await getMeetingParticipants(platform, nativeMeetingId);
    const humanCount = countHumanParticipants(participants);
    if (humanCount > 0) return false;

    if (inLobby) {
      return true;
    }

    const transcript = await getTranscript(platform, nativeMeetingId);
    const segments = transcript.segments ?? [];
    const lastHumanActivityMs = getLastHumanTranscriptActivityMs(segments);

    if (lastHumanActivityMs == null) {
      return activeForMs >= EMPTY_ROOM_GRACE_MS;
    }

    return Date.now() - lastHumanActivityMs >= EMPTY_ROOM_GRACE_MS;
  } catch (err) {
    logStructured("warn", "bot.auto_leave.check_failed", {
      platform,
      nativeMeetingId,
      message: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/** Horário previsto de auto-saída quando a sala está vazia (ISO). Null se não aplicável. */
export function resolveAutoLeaveAt(input: {
  vexaStatus: string | null;
  meetingStartedAt: string | null;
  humanCount: number | null;
  lastHumanActivityMs: number | null;
}): string | null {
  if (input.humanCount == null || input.humanCount > 0) return null;
  if (!input.vexaStatus || !input.meetingStartedAt) return null;

  const inLobby = isJoiningVexaStatus(input.vexaStatus);
  if (!isCapturingVexaStatus(input.vexaStatus) && !inLobby) return null;

  const startedMs = new Date(input.meetingStartedAt).getTime();

  if (inLobby) {
    return new Date(startedMs + EMPTY_LOBBY_MIN_MS).toISOString();
  }

  const leaveAtMs =
    input.lastHumanActivityMs != null
      ? input.lastHumanActivityMs + EMPTY_ROOM_GRACE_MS
      : startedMs + EMPTY_ROOM_GRACE_MS;

  return new Date(leaveAtMs).toISOString();
}
