import type { createClient } from "@/lib/supabase/server";
import type { ActionItem, MeetingSummary } from "@/lib/supabase/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export type SummaryTopic = { title: string; summary: string };

export async function getMeetingSummary(
  supabase: Client,
  meetingId: string
): Promise<MeetingSummary | null> {
  const { data } = await supabase
    .from("meeting_summaries")
    .select("*")
    .eq("meeting_id", meetingId)
    .maybeSingle<MeetingSummary>();

  return data ?? null;
}

export async function getActionItems(
  supabase: Client,
  meetingId: string
): Promise<ActionItem[]> {
  const { data } = await supabase
    .from("action_items")
    .select("*")
    .eq("meeting_id", meetingId)
    .order("created_at", { ascending: true });

  return (data ?? []) as ActionItem[];
}

/** Normaliza o campo `topics` (Json) para um array tipado. */
export function parseTopics(topics: MeetingSummary["topics"]): SummaryTopic[] {
  if (!Array.isArray(topics)) return [];
  return topics
    .map((entry) => {
      if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return null;
      const t = entry as Record<string, unknown>;
      return {
        title: typeof t.title === "string" ? t.title : "",
        summary: typeof t.summary === "string" ? t.summary : "",
      };
    })
    .filter((t): t is SummaryTopic => t !== null && Boolean(t.title || t.summary));
}

/** Normaliza o campo `decisions` (Json) para string[]. */
export function parseDecisions(decisions: MeetingSummary["decisions"]): string[] {
  if (!Array.isArray(decisions)) return [];
  return decisions.filter((d): d is string => typeof d === "string");
}
