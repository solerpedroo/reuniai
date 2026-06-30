import "server-only";

import { getBotAvatarUrl, getBotScreenUrl } from "@/lib/brand/config";
import type { BotPlatform } from "@/lib/meetings/meeting-url";
import { setBotAvatar, setBotScreen } from "@/lib/vexa/client";

const RETRY_ATTEMPTS = 6;
const RETRY_DELAY_MS = 3_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type ApplyBotBrandingResult = {
  avatar: boolean;
  screen: boolean;
  errors: string[];
};

/**
 * Aplica avatar (câmera virtual) e fundo de tela ao bot após entrar na call.
 * O bot precisa estar ativo — por isso fazemos retry com backoff fixo.
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

  for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt += 1) {
    if (!avatar) {
      try {
        await setBotAvatar(platform, nativeMeetingId, { url: avatarUrl });
        avatar = true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Falha ao definir avatar.";
        if (attempt === RETRY_ATTEMPTS - 1) errors.push(msg);
      }
    }

    if (!screen) {
      try {
        await setBotScreen(platform, nativeMeetingId, { type: "image", url: screenUrl });
        screen = true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Falha ao definir tela.";
        if (attempt === RETRY_ATTEMPTS - 1) errors.push(msg);
      }
    }

    if (avatar && screen) break;
    if (attempt < RETRY_ATTEMPTS - 1) await sleep(RETRY_DELAY_MS);
  }

  return { avatar, screen, errors };
}
