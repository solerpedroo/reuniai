import type { MeetingPlatform } from "@/lib/supabase/types";

export function detectPlatform(url: string): MeetingPlatform {
  if (url.includes("meet.google.com")) return "google_meet";
  if (url.includes("zoom.us")) return "zoom";
  if (
    url.includes("teams.microsoft.com") ||
    url.includes("teams.live.com") ||
    url.includes("gov.teams.microsoft.us") ||
    url.includes("dod.teams.microsoft.us")
  ) {
    return "teams";
  }
  return "other";
}

const URL_PATTERNS: RegExp[] = [
  /https:\/\/[a-z0-9-]*\.?meet\.google\.com\/[^\s<>"')]+/i,
  /https:\/\/[a-z0-9.-]*zoom\.us\/[^\s<>"')]+/i,
  /https:\/\/(?:gov\.|dod\.)?teams\.(?:microsoft\.(?:com|us)|live\.com)\/[^\s<>"')]+/i,
];

/** Procura uma URL de reunião conhecida dentro de um texto livre. */
export function findMeetingUrlInText(text: string | null | undefined): string | null {
  if (!text) return null;
  for (const pattern of URL_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return null;
}
