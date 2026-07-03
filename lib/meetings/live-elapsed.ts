/** Tempo decorrido desde o início da reunião (ms), usado na captura ao vivo. */
export function getLiveElapsedMs(startedAt: string, now = Date.now()): number {
  const startMs = new Date(startedAt).getTime();
  if (!Number.isFinite(startMs)) return 0;
  return Math.max(0, now - startMs);
}

export const LIVE_MEETING_STATUSES = new Set([
  "bot_joining",
  "recording",
] as const);

export function isLiveMeetingStatus(status: string): boolean {
  return LIVE_MEETING_STATUSES.has(status as "bot_joining" | "recording");
}
