import "server-only";

import type { BotPlatform } from "@/lib/meetings/meeting-url";
import {
  getMeetingParticipants,
  getRunningBots,
  getTranscript,
  getVexaMeeting,
  listVexaMeetings,
  type VexaMeeting,
  type VexaTranscriptSegment,
} from "@/lib/vexa/client";

/** Silêncio na transcrição antes de considerar sala vazia e encerrar o bot. */
export const EMPTY_ROOM_SILENCE_MS = 90_000;
/** Tempo mínimo na reunião antes de auto-saída por silêncio (evita sair cedo demais). */
export const EMPTY_ROOM_MIN_ACTIVE_MS = 120_000;
/** Janela de tolerância enquanto o bot ainda está entrando (evita falso "completed"). */
export const JOINING_GRACE_MS = 3 * 60_000;
/** Tempo máximo em lobby/entrada antes de marcar falha. */
export const JOINING_TIMEOUT_MS = 15 * 60_000;
/** Tempo mínimo no lobby vazio antes de desistir da entrada. */
export const EMPTY_LOBBY_MIN_MS = 60_000;

const JOINING_STATUSES = new Set(["requested", "joining", "awaiting_admission"]);
const CAPTURING_STATUSES = new Set(["active", "stopping"]);

export type VexaMeetingState = {
  status: string;
  startTime?: string | null;
  endTime?: string | null;
};

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

export function getLastTranscriptActivityMs(segments: VexaTranscriptSegment[]): number | null {
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index];
    if (segment.absolute_end_time) return new Date(segment.absolute_end_time).getTime();
    if (segment.absolute_start_time) return new Date(segment.absolute_start_time).getTime();
  }
  return null;
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
  const minWaitMs = inLobby ? EMPTY_LOBBY_MIN_MS : EMPTY_ROOM_MIN_ACTIVE_MS;
  if (activeForMs < minWaitMs) return false;

  try {
    const participants = await getMeetingParticipants(platform, nativeMeetingId);
    if (participants.participant_count > 0) return false;

    if (inLobby) {
      return true;
    }

    const transcript = await getTranscript(platform, nativeMeetingId);
    const segments = transcript.segments ?? [];
    const lastActivityMs = getLastTranscriptActivityMs(segments);

    if (lastActivityMs == null) {
      return activeForMs >= EMPTY_ROOM_MIN_ACTIVE_MS;
    }

    return Date.now() - lastActivityMs >= EMPTY_ROOM_SILENCE_MS;
  } catch {
    return false;
  }
}
