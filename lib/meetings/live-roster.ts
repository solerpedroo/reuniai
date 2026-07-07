import "server-only";

import { isLikelyBotParticipant } from "@/lib/vexa/meeting-state";
import type { createAdminClient } from "@/lib/supabase/admin";
import type {
  VexaMeetingParticipantsResponse,
  VexaTranscriptSegment,
} from "@/lib/vexa/client";

type AdminClient = ReturnType<typeof createAdminClient>;

export function normalizeLiveRosterName(name: string | null | undefined): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase();
}

export function humanNamesFromParticipantsResponse(
  response: VexaMeetingParticipantsResponse | null | undefined
): string[] {
  if (!response) return [];

  const names = new Set<string>();
  for (const participant of response.participants ?? []) {
    if (isLikelyBotParticipant(participant.name)) continue;
    const key = normalizeLiveRosterName(participant.name);
    if (key) names.add(key);
  }
  return [...names];
}

export function humanNamesFromTranscript(segments: VexaTranscriptSegment[]): string[] {
  const names = new Set<string>();
  for (const segment of segments) {
    if (isLikelyBotParticipant(segment.speaker)) continue;
    const key = normalizeLiveRosterName(segment.speaker);
    if (key) names.add(key);
  }
  return [...names];
}

export function mergeLiveRosterNames(existing: string[], additions: string[]): string[] {
  const merged = new Set(
    existing.map((name) => name.trim().toLowerCase()).filter((name) => name.length > 0)
  );

  for (const addition of additions) {
    const key = normalizeLiveRosterName(addition);
    if (key) merged.add(key);
  }

  return [...merged];
}

/** Atualiza roster sticky: acumula detecções e poda quem sumiu da lista atual do Vexa. */
export function reconcileLiveRosterNames(
  existing: string[],
  apiResponse: VexaMeetingParticipantsResponse | null | undefined,
  segments: VexaTranscriptSegment[]
): string[] {
  const fromApi = humanNamesFromParticipantsResponse(apiResponse);
  const fromTranscript = humanNamesFromTranscript(segments);
  let next = mergeLiveRosterNames(existing, [...fromApi, ...fromTranscript]);

  const apiList = apiResponse?.participants ?? [];
  if (apiList.length > 0) {
    const current = new Set(fromApi);
    next = next.filter((name) => current.has(name));
    next = mergeLiveRosterNames(next, fromApi);
  }

  return next;
}

export async function loadLiveRosterNames(
  admin: AdminClient,
  meetingId: string
): Promise<string[]> {
  const { data } = await admin
    .from("meetings")
    .select("live_roster_names")
    .eq("id", meetingId)
    .maybeSingle<{ live_roster_names: string[] | null }>();

  return data?.live_roster_names ?? [];
}

export async function syncLiveRosterNames(
  admin: AdminClient,
  meetingId: string,
  apiResponse: VexaMeetingParticipantsResponse | null | undefined,
  segments: VexaTranscriptSegment[]
): Promise<string[]> {
  const existing = await loadLiveRosterNames(admin, meetingId);
  const next = reconcileLiveRosterNames(existing, apiResponse, segments);

  const changed =
    next.length !== existing.length || next.some((name, index) => name !== existing[index]);

  if (changed) {
    await admin.from("meetings").update({ live_roster_names: next }).eq("id", meetingId);
  }

  return next;
}

export async function clearLiveRosterNames(
  admin: AdminClient,
  meetingId: string
): Promise<void> {
  await admin.from("meetings").update({ live_roster_names: [] }).eq("id", meetingId);
}
