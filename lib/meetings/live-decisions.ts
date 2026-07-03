import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";

type UserClient = Awaited<ReturnType<typeof createClient>>;
type AdminClient = ReturnType<typeof createAdminClient>;

export type MeetingLiveDecision = {
  id: string;
  meeting_id: string;
  user_id: string;
  text: string;
  captured_at_ms: number;
  created_at: string;
};

export async function getLiveDecisionsForMeeting(
  supabase: UserClient,
  meetingId: string
): Promise<MeetingLiveDecision[]> {
  const { data, error } = await supabase
    .from("meeting_live_decisions")
    .select("*")
    .eq("meeting_id", meetingId)
    .order("captured_at_ms", { ascending: true });

  if (error) throw error;
  return (data ?? []) as MeetingLiveDecision[];
}

export async function mergeLiveDecisionsIntoSummary(
  admin: AdminClient,
  meetingId: string
): Promise<string[]> {
  const { data: liveRows } = await admin
    .from("meeting_live_decisions")
    .select("text")
    .eq("meeting_id", meetingId)
    .order("captured_at_ms", { ascending: true });

  const liveTexts = ((liveRows ?? []) as { text: string }[])
    .map((row) => row.text.trim())
    .filter(Boolean);

  if (liveTexts.length === 0) return [];

  const { data: summary } = await admin
    .from("meeting_summaries")
    .select("decisions")
    .eq("meeting_id", meetingId)
    .maybeSingle<{ decisions: unknown }>();

  if (!summary) return liveTexts;

  const existing = parseDecisionList(summary.decisions);
  const merged = dedupeDecisions([...liveTexts, ...existing]);

  const { error } = await admin
    .from("meeting_summaries")
    .update({ decisions: merged as unknown as never })
    .eq("meeting_id", meetingId);

  if (error) throw error;

  return merged;
}

function parseDecisionList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function dedupeDecisions(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const text = item.trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(text);
  }
  return result;
}
