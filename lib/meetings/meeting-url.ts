import type { MeetingPlatform } from "@/lib/supabase/types";
import { detectPlatform } from "@/lib/calendar/platform";

/** Plataformas suportadas pelo bot Vexa. */
export type BotPlatform = "google_meet" | "teams" | "zoom";

export type ParsedMeeting = {
  platform: BotPlatform;
  nativeMeetingId: string;
  passcode?: string;
  /** URL completa para Vexa quando ID numérico não é extraível (Teams legacy). */
  meetingUrl?: string;
};

const TEAMS_NUMERIC_ID_PATTERNS = [/\/meet\/(\d{10,15})/i, /#\/meet\/(\d{10,15})/i];

/** Extrai o ID numérico de links Teams (teams.live.com/meet/…, deep links, gov/dod). */
export function extractTeamsNumericId(url: string): string | null {
  for (const pattern of TEAMS_NUMERIC_ID_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

/** Extrai o passcode (`?p=`) de links Teams (query ou fragmento). */
export function extractTeamsPasscode(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    const fromQuery = parsed.searchParams.get("p");
    if (fromQuery) return fromQuery;

    const hash = parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash;
    const hashQueryStart = hash.indexOf("?");
    if (hashQueryStart >= 0) {
      const fromHash = new URLSearchParams(hash.slice(hashQueryStart + 1)).get("p");
      if (fromHash) return fromHash;
    }
  } catch {
    // ignore
  }

  const match = url.match(/[?&#][pP]=([^&#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

function isLegacyTeamsMeetupJoinUrl(url: string): boolean {
  return /\/l\/meetup-join\//i.test(url);
}

function parseTeamsMeetingUrl(url: string): ParsedMeeting | null {
  const numericId = extractTeamsNumericId(url);
  const passcode = extractTeamsPasscode(url);

  if (numericId && passcode) {
    return { platform: "teams", nativeMeetingId: numericId, passcode };
  }

  if (isLegacyTeamsMeetupJoinUrl(url)) {
    return { platform: "teams", nativeMeetingId: url, meetingUrl: url };
  }

  return null;
}

/**
 * Extrai a plataforma e o identificador nativo da reunião a partir da URL,
 * no formato exigido pela API do Vexa.
 *
 * - Google Meet: `https://meet.google.com/abc-defg-hij` → `abc-defg-hij`
 * - Zoom: `https://zoom.us/j/123456789?pwd=...` → `123456789` (+ passcode)
 * - Teams: `https://teams.live.com/meet/1234567890123?p=PASS` → id + passcode
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
    return parseTeamsMeetingUrl(url);
  }

  return null;
}

/** Indica se uma plataforma de meeting é suportada pelo bot. */
export function isBotSupportedPlatform(platform: MeetingPlatform): boolean {
  return platform === "google_meet" || platform === "zoom" || platform === "teams";
}
