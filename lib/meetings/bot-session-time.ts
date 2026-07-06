import type { Meeting } from "@/lib/supabase/types";

type BotSessionMeeting = Pick<Meeting, "started_at"> & {
  bot_session_started_at?: string | null;
};

/** Referência temporal da sessão ao vivo do bot (independente do horário do calendário). */
export function resolveBotSessionStartedAt(meeting: BotSessionMeeting): string {
  return meeting.bot_session_started_at ?? meeting.started_at;
}

/** Tempo decorrido desde o bot entrou na call (ms). */
export function getBotSessionElapsedMs(
  meeting: BotSessionMeeting,
  now = Date.now()
): number {
  const startMs = new Date(resolveBotSessionStartedAt(meeting)).getTime();
  if (!Number.isFinite(startMs)) return 0;
  return Math.max(0, now - startMs);
}

/** Início efetivo para cálculo de duração pós-reunião. */
export function resolveDurationStartMs(meeting: BotSessionMeeting): number {
  return new Date(resolveBotSessionStartedAt(meeting)).getTime();
}
