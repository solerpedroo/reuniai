/** Tempo decorrido desde o início da reunião (ms), usado na captura ao vivo. */
export function getLiveElapsedMs(startedAt: string, now = Date.now()): number {
  const startMs = new Date(startedAt).getTime();
  if (!Number.isFinite(startMs)) return 0;
  return Math.max(0, now - startMs);
}

import { BOT_ACTIVE_STATUSES } from "@/lib/meetings/bot-lifecycle";

export const LIVE_MEETING_STATUSES = BOT_ACTIVE_STATUSES;

export function isLiveMeetingStatus(status: string): boolean {
  return BOT_ACTIVE_STATUSES.has(status as "bot_joining" | "recording");
}
