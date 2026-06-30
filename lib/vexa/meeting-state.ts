import "server-only";

import type { BotPlatform } from "@/lib/meetings/meeting-url";
import {
  getMeetingParticipants,
  getRunningBots,
  getTranscript,
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
}): string {
  if (input.vexaMeeting?.status) {
    return input.vexaMeeting.status;
  }

  if (input.container?.containerUp) {
    if (input.dbStatus === "recording") return "active";
    return "joining";
  }

  const elapsedMs = Date.now() - new Date(input.meetingStartedAt).getTime();
  if (input.dbStatus === "bot_joining" && elapsedMs < JOINING_GRACE_MS) {
    return "joining";
  }

  return "completed";
}

/**
 * Detecta reunião vazia: bot ainda ativo, mas sem fala recente na transcrição.
 * Fallback quando o Vexa não dispara auto-leave sozinho.
 */
export async function shouldAutoLeaveEmptyMeeting(
  platform: BotPlatform,
  nativeMeetingId: string,
  vexaStatus: string,
  meetingStartedAt: string
): Promise<boolean> {
  if (vexaStatus !== "active") return false;

  const activeForMs = Date.now() - new Date(meetingStartedAt).getTime();
  if (activeForMs < EMPTY_ROOM_MIN_ACTIVE_MS) return false;

  try {
    const transcript = await getTranscript(platform, nativeMeetingId);
    const segments = transcript.segments ?? [];
    const lastActivityMs = getLastTranscriptActivityMs(segments);

    if (lastActivityMs == null) {
      return activeForMs >= EMPTY_ROOM_MIN_ACTIVE_MS;
    }

    if (Date.now() - lastActivityMs < EMPTY_ROOM_SILENCE_MS) {
      return false;
    }

    const participants = await getMeetingParticipants(platform, nativeMeetingId);
    return participants.participant_count === 0;
  } catch {
    return false;
  }
}
