import "server-only";

import { getBotAvatarUrl, getBotScreenUrl } from "@/lib/brand/config";
import type { BotPlatform } from "@/lib/meetings/meeting-url";
import { listVexaMeetings, setBotAvatar, setBotScreen } from "@/lib/vexa/client";

/** Quanto tempo esperamos o bot sair de `joining`/`awaiting_admission` e ficar `active`. */
const ACTIVE_POLL_ATTEMPTS = 20;
const ACTIVE_POLL_DELAY_MS = 3_000;

/** Retries de envio dos comandos de tela/avatar após o bot ficar ativo. */
const COMMAND_ATTEMPTS = 3;
const COMMAND_DELAY_MS = 2_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Confirma que o Vexa consegue baixar o asset por URL pública (evita 404 silencioso). */
async function isAssetReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Aguarda o bot ficar `active`. Comandos de tela/avatar são descartados enquanto
 * o bot está entrando ou na sala de espera, então só os enviamos depois disso.
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

export type ApplyBotBrandingResult = {
  avatar: boolean;
  screen: boolean;
  errors: string[];
};

/**
 * Aplica fundo de tela (screen share — recomendado) e avatar (câmera virtual —
 * experimental no Meet) ao bot depois que ele entra na call. Não bloqueia o join.
 */
export async function applyBotBranding(
  platform: BotPlatform,
  nativeMeetingId: string
): Promise<ApplyBotBrandingResult> {
  const avatarUrl = getBotAvatarUrl();
  const screenUrl = getBotScreenUrl();
  const errors: string[] = [];
  let avatar = false;
  let screen = false;

  const active = await waitForBotActive(platform, nativeMeetingId);
  if (!active) {
    errors.push(
      "Bot não ficou ativo a tempo (sala de espera/admissão) — branding não aplicado."
    );
    return { avatar, screen, errors };
  }

  const [screenReachable, avatarReachable] = await Promise.all([
    isAssetReachable(screenUrl),
    isAssetReachable(avatarUrl),
  ]);

  if (!screenReachable) {
    errors.push(
      `Imagem de fundo inacessível publicamente (${screenUrl}). Defina BOT_SCREEN_URL/NEXT_PUBLIC_APP_URL para uma URL pública.`
    );
  }
  if (!avatarReachable) {
    errors.push(`Imagem de avatar inacessível publicamente (${avatarUrl}).`);
  }

  for (let attempt = 0; attempt < COMMAND_ATTEMPTS; attempt += 1) {
    // Screen share é o caminho confiável para mostrar o fundo de marca.
    if (!screen && screenReachable) {
      try {
        await setBotScreen(platform, nativeMeetingId, { type: "image", url: screenUrl });
        screen = true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Falha ao definir tela.";
        if (attempt === COMMAND_ATTEMPTS - 1) errors.push(msg);
      }
    }

    // Câmera virtual é best-effort (experimental no Meet).
    if (!avatar && avatarReachable) {
      try {
        await setBotAvatar(platform, nativeMeetingId, { url: avatarUrl });
        avatar = true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Falha ao definir avatar.";
        if (attempt === COMMAND_ATTEMPTS - 1) errors.push(msg);
      }
    }

    const screenDone = screen || !screenReachable;
    const avatarDone = avatar || !avatarReachable;
    if (screenDone && avatarDone) break;
    if (attempt < COMMAND_ATTEMPTS - 1) await sleep(COMMAND_DELAY_MS);
  }

  return { avatar, screen, errors };
}
