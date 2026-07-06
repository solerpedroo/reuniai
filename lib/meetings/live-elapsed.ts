import type { Meeting } from "@/lib/supabase/types";
import { getBotSessionElapsedMs } from "@/lib/meetings/bot-session-time";

/** Tempo decorrido desde o bot entrou na call (ms), usado na captura ao vivo. */
export function getLiveElapsedMs(
  meeting: Pick<Meeting, "started_at"> & { bot_session_started_at?: string | null },
  now = Date.now()
): number {
  return getBotSessionElapsedMs(meeting, now);
}

import { BOT_ACTIVE_STATUSES } from "@/lib/meetings/bot-lifecycle";

export const LIVE_MEETING_STATUSES = BOT_ACTIVE_STATUSES;

export function isLiveMeetingStatus(status: string): boolean {
  return BOT_ACTIVE_STATUSES.has(status as "bot_joining" | "recording");
}
