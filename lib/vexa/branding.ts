import "server-only";

import { getBotAvatarUrlCandidates, getBotScreenUrlCandidates } from "@/lib/brand/bot-image-urls";
import type { BotPlatform } from "@/lib/meetings/meeting-url";
import { listVexaMeetings, setBotAvatar, setBotScreen } from "@/lib/vexa/client";

/** Quanto tempo esperamos o bot sair de `joining`/`awaiting_admission` e ficar `active`. */
const ACTIVE_POLL_ATTEMPTS = 20;
const ACTIVE_POLL_DELAY_MS = 3_000;

/** Retries da câmera virtual — experimental no Meet; precisa de persistência. */
const AVATAR_ATTEMPTS = 6;
const AVATAR_QUICK_ATTEMPTS = 1;
const AVATAR_DELAY_MS = 5_000;

/** Retries de screen share (Teams / fallback). */
const SCREEN_ATTEMPTS = 3;
const SCREEN_DELAY_MS = 2_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logBranding(
  platform: BotPlatform,
  nativeMeetingId: string,
  result: ApplyBotBrandingResult
): void {
  if (result.errors.length === 0 && result.avatar) return;
  console.warn(
    `[bot-branding] ${platform}/${nativeMeetingId}: avatar=${result.avatar} screen=${result.screen} — ${result.errors.join(" | ") || "avatar não aplicado"}`
  );
}

/** Confirma que conseguimos baixar o asset (evita 404 silencioso). */
async function isAssetReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

/** Baixa a imagem e envia em base64 — mais confiável que a Vexa buscar a URL. */
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    return Buffer.from(buffer).toString("base64");
  } catch {
    return null;
  }
}

/**
 * Aguarda o bot ficar `active`. Comandos de tela/avatar são descartados enquanto
 * o bot está entrando ou na sala de espera.
 */
async function waitForBotActive(
  platform: BotPlatform,
  nativeMeetingId: string
): Promise<boolean> {
  for (let attempt = 0; attempt < ACTIVE_POLL_ATTEMPTS; attempt += 1) {
    try {
      const meetings = await listVexaMeetings();
      const meeting = meetings.find(
        (item) =>
          item.native_meeting_id === nativeMeetingId && item.platform === platform
      );
      if (meeting?.status === "active") return true;
      if (meeting && ["completed", "failed"].includes(meeting.status)) return false;
    } catch {
      /* status indisponível neste ciclo; tenta de novo */
    }
    await sleep(ACTIVE_POLL_DELAY_MS);
  }
  return false;
}

export type ApplyBotBrandingOptions = {
  /** Bot já confirmado como `active` (webhook/poll) — pula o polling. */
  skipWait?: boolean;
  /** Uma única tentativa (poll periódico) em vez do burst completo. */
  quickRetry?: boolean;
};

export type ApplyBotBrandingResult = {
  avatar: boolean;
  screen: boolean;
  errors: string[];
};

/** Tenta cada URL em ordem até achar uma acessível publicamente. */
async function resolveReachableUrl(
  candidates: string[],
  label: string
): Promise<{ url: string | null; errors: string[] }> {
  const errors: string[] = [];
  for (const url of candidates) {
    if (await isAssetReachable(url)) return { url, errors };
    errors.push(`${label} inacessível: ${url}`);
  }
  return { url: null, errors };
}

async function applyAvatarBranding(
  platform: BotPlatform,
  nativeMeetingId: string,
  avatarCandidates: string[],
  maxAttempts = AVATAR_ATTEMPTS
): Promise<{ ok: boolean; errors: string[] }> {
  const errors: string[] = [];
  const resolved = await resolveReachableUrl(avatarCandidates, "Imagem da câmera");
  errors.push(...resolved.errors);

  if (!resolved.url) {
    errors.push(
      "Nenhuma URL de câmera acessível. Rode npm run brand:upload ou defina BOT_AVATAR_URL."
    );
    return { ok: false, errors };
  }

  const avatarUrl = resolved.url;
  const imageBase64 = await fetchImageAsBase64(avatarUrl);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      await setBotAvatar(platform, nativeMeetingId, {
        url: imageBase64 ? undefined : avatarUrl,
        imageBase64: imageBase64 ?? undefined,
      });
      return { ok: true, errors };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao definir câmera virtual.";
      if (attempt === maxAttempts - 1) errors.push(msg);
      if (attempt < maxAttempts - 1) await sleep(AVATAR_DELAY_MS);
    }
  }

  return { ok: false, errors };
}

async function applyScreenBranding(
  platform: BotPlatform,
  nativeMeetingId: string,
  screenCandidates: string[]
): Promise<{ ok: boolean; errors: string[] }> {
  const errors: string[] = [];
  const resolved = await resolveReachableUrl(screenCandidates, "Imagem de tela");
  errors.push(...resolved.errors);

  if (!resolved.url) {
    errors.push("Nenhuma URL de tela acessível. Rode npm run brand:upload ou defina BOT_SCREEN_URL.");
    return { ok: false, errors };
  }

  const screenUrl = resolved.url;

  for (let attempt = 0; attempt < SCREEN_ATTEMPTS; attempt += 1) {
    try {
      await setBotScreen(platform, nativeMeetingId, {
        type: "image",
        url: screenUrl,
      });
      return { ok: true, errors };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao definir tela.";
      if (attempt === SCREEN_ATTEMPTS - 1) errors.push(msg);
      if (attempt < SCREEN_ATTEMPTS - 1) await sleep(SCREEN_DELAY_MS);
    }
  }

  return { ok: false, errors };
}

/**
 * Aplica branding do bot na call.
 *
 * Google Meet / Zoom: câmera virtual com `bot-background.png` (estilo Fireflies).
 * Teams: screen share (câmera virtual não é visível para participantes).
 */
export async function applyBotBranding(
  platform: BotPlatform,
  nativeMeetingId: string,
  options: ApplyBotBrandingOptions = {}
): Promise<ApplyBotBrandingResult> {
  const avatarCandidates = getBotAvatarUrlCandidates();
  const screenCandidates = getBotScreenUrlCandidates();
  const errors: string[] = [];
  let avatar = false;
  let screen = false;

  if (!options.skipWait) {
    const active = await waitForBotActive(platform, nativeMeetingId);
    if (!active) {
      errors.push(
        "Bot não ficou ativo a tempo (sala de espera/admissão) — branding não aplicado."
      );
      return { avatar, screen, errors };
    }
  }

  if (platform === "teams") {
    const screenResult = await applyScreenBranding(platform, nativeMeetingId, screenCandidates);
    screen = screenResult.ok;
    errors.push(...screenResult.errors);
    return { avatar, screen, errors };
  }

  // Meet/Zoom: câmera ligada com a imagem de marca (comportamento Fireflies).
  const avatarAttempts = options.quickRetry ? AVATAR_QUICK_ATTEMPTS : AVATAR_ATTEMPTS;
  const avatarResult = await applyAvatarBranding(
    platform,
    nativeMeetingId,
    avatarCandidates,
    avatarAttempts
  );
  avatar = avatarResult.ok;
  errors.push(...avatarResult.errors);

  return { avatar, screen, errors };
}

/** Dispara branding em background com log padronizado. */
export function scheduleBotBranding(
  platform: BotPlatform,
  nativeMeetingId: string,
  options: ApplyBotBrandingOptions = {}
): void {
  void applyBotBranding(platform, nativeMeetingId, options)
    .then((result) => logBranding(platform, nativeMeetingId, result))
    .catch((err) => {
      console.warn(
        `[bot-branding] ${platform}/${nativeMeetingId} falhou:`,
        err instanceof Error ? err.message : err
      );
    });
}
