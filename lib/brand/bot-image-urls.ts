import "server-only";

import { BRAND_ASSETS, getAppUrl } from "@/lib/brand/config";

export const BRAND_STORAGE_BUCKET = "brand" as const;
export const BRAND_STORAGE_OBJECT = "bot-background.png" as const;

/** URL pública no Supabase Storage (bucket `brand`). */
export function getSupabaseBrandPublicUrl(
  objectPath = BRAND_STORAGE_OBJECT
): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!supabaseUrl) return null;
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${BRAND_STORAGE_BUCKET}/${objectPath}`;
}

function uniqueUrls(urls: Array<string | null | undefined>): string[] {
  return [...new Set(urls.filter((url): url is string => Boolean(url?.trim())))];
}

/** Candidatos em ordem de prioridade para a câmera virtual do bot. */
export function getBotAvatarUrlCandidates(): string[] {
  return uniqueUrls([
    process.env.BOT_AVATAR_URL?.trim(),
    getSupabaseBrandPublicUrl(),
    `${getAppUrl()}${BRAND_ASSETS.botBackground}`,
  ]);
}

/** Candidatos em ordem de prioridade para screen share (Teams). */
export function getBotScreenUrlCandidates(): string[] {
  return uniqueUrls([
    process.env.BOT_SCREEN_URL?.trim(),
    getSupabaseBrandPublicUrl(),
    `${getAppUrl()}${BRAND_ASSETS.botBackground}`,
  ]);
}

/** Primeira URL candidata (para preview/UI). */
export function getBotAvatarUrl(): string {
  const candidates = getBotAvatarUrlCandidates();
  return candidates[0] ?? `${getAppUrl()}${BRAND_ASSETS.botBackground}`;
}

export function getBotScreenUrl(): string {
  const candidates = getBotScreenUrlCandidates();
  return candidates[0] ?? `${getAppUrl()}${BRAND_ASSETS.botBackground}`;
}
