import type { MeetingPlatform } from "@/lib/supabase/types";
import { detectPlatform } from "@/lib/calendar/platform";

/** Plataformas suportadas pelo bot Vexa. */
export type BotPlatform = "google_meet" | "teams" | "zoom";

export type ParsedMeeting = {
  platform: BotPlatform;
  nativeMeetingId: string;
  passcode?: string;
};

/**
 * Extrai a plataforma e o identificador nativo da reunião a partir da URL,
 * no formato exigido pela API do Vexa.
 *
 * - Google Meet: `https://meet.google.com/abc-defg-hij` → `abc-defg-hij`
 * - Zoom: `https://zoom.us/j/123456789?pwd=...` → `123456789` (+ passcode)
 * - Teams: identificador codificado na URL (não suportado de forma confiável)
 */
export function parseMeetingUrl(url: string): ParsedMeeting | null {
  const platform = detectPlatform(url);

  if (platform === "google_meet") {
    const match = url.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
    if (!match) return null;
    return { platform: "google_meet", nativeMeetingId: match[1] };
  }

  if (platform === "zoom") {
    const match = url.match(/zoom\.us\/(?:j|my)\/([0-9]{8,12})/i);
    if (!match) return null;
    let passcode: string | undefined;
    try {
      passcode = new URL(url).searchParams.get("pwd") ?? undefined;
    } catch {
      passcode = undefined;
    }
    return { platform: "zoom", nativeMeetingId: match[1], passcode };
  }

  if (platform === "teams") {
    // Teams exige thread id + passcode; extração confiável fica para depois.
    return null;
  }

  return null;
}

/** Indica se uma plataforma de meeting é suportada pelo bot. */
export function isBotSupportedPlatform(platform: MeetingPlatform): boolean {
  return platform === "google_meet" || platform === "zoom" || platform === "teams";
}
