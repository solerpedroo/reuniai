import { detectPlatform, findMeetingUrlInText } from "@/lib/calendar/platform";
import {
  extractTeamsNumericId,
  extractTeamsPasscode,
  parseMeetingUrl,
} from "@/lib/meetings/meeting-url";
import { PLATFORM_LABELS } from "@/lib/meetings/types";
import type { MeetingPlatform } from "@/lib/supabase/types";

export type MeetingUrlPreviewTone = "idle" | "valid" | "warning" | "error";

export type MeetingUrlPreview = {
  normalizedUrl: string | null;
  platform: MeetingPlatform | null;
  platformLabel: string | null;
  botSupported: boolean;
  message: string;
  tone: MeetingUrlPreviewTone;
};

/** Extrai e normaliza um link de reunião a partir de texto livre ou URL parcial. */
export function normalizeMeetingUrlInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.split(/\s/)[0] ?? null;
  }

  const extracted = findMeetingUrlInText(trimmed);
  if (extracted) return extracted;

  const withProtocol = `https://${trimmed.replace(/^\/\//, "")}`;
  if (
    findMeetingUrlInText(withProtocol) ||
    /meet\.google|zoom\.us|teams\.(microsoft|live)\.com|gov\.teams\.microsoft\.us|dod\.teams\.microsoft\.us/i.test(
      withProtocol
    )
  ) {
    return withProtocol;
  }

  return null;
}

/** Validação em tempo real para UI e API (client + server safe). */
export function previewMeetingUrlInput(raw: string): MeetingUrlPreview {
  if (!raw.trim()) {
    return {
      normalizedUrl: null,
      platform: null,
      platformLabel: null,
      botSupported: false,
      message: "Cole o link da reunião — Google Meet, Zoom ou Teams.",
      tone: "idle",
    };
  }

  const normalizedUrl = normalizeMeetingUrlInput(raw);
  if (!normalizedUrl) {
    return {
      normalizedUrl: null,
      platform: null,
      platformLabel: null,
      botSupported: false,
      message: "Não encontramos um link válido. Verifique o endereço.",
      tone: "error",
    };
  }

  const platform = detectPlatform(normalizedUrl);
  const platformLabel = PLATFORM_LABELS[platform];

  if (platform === "other") {
    return {
      normalizedUrl,
      platform,
      platformLabel,
      botSupported: false,
      message: "Plataforma não reconhecida. Use Google Meet, Zoom ou Teams.",
      tone: "error",
    };
  }

  const parsed = parseMeetingUrl(normalizedUrl);
  if (!parsed) {
    if (platform === "teams") {
      const numericId = extractTeamsNumericId(normalizedUrl);
      const passcode = extractTeamsPasscode(normalizedUrl);
      if (numericId && !passcode) {
        return {
          normalizedUrl,
          platform,
          platformLabel,
          botSupported: false,
          message:
            "Link Teams reconhecido, mas falta a senha (?p=) no endereço. Copie o link completo do convite.",
          tone: "error",
        };
      }
    }

    return {
      normalizedUrl,
      platform,
      platformLabel,
      botSupported: false,
      message: "Link reconhecido, mas o formato não é válido para o bot.",
      tone: "error",
    };
  }

  return {
    normalizedUrl,
    platform,
    platformLabel,
    botSupported: true,
    message: `${platformLabel} detectado — pronto para gravar.`,
    tone: "valid",
  };
}
