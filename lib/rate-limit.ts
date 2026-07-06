import "server-only";

/** Rate limit in-memory (best-effort; reseta em cold start serverless). */
const hits = new Map<string, number[]>();

export type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

export function isRateLimited({ key, limit, windowMs }: RateLimitOptions): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > limit;
}

export const RATE_LIMITS = {
  chat: { limit: 20, windowMs: 60_000 },
  assistant: { limit: 15, windowMs: 60_000 },
  bot: { limit: 10, windowMs: 60_000 },
  session: { limit: 60, windowMs: 60_000 },
  transcriptReprocess: { limit: 5, windowMs: 60_000 },
  followUpGenerate: { limit: 5, windowMs: 60_000 },
  followUpSend: { limit: 5, windowMs: 60_000 },
  search: { limit: 30, windowMs: 60_000 },
} as const;

export function rateLimitResponse(message = "Muitas requisições. Aguarde um instante.") {
  return { error: message, status: 429 as const };
}
