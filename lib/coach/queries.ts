import "server-only";

import type { createClient } from "@/lib/supabase/server";
import type { CoachReport } from "@/lib/coach/analyze-meeting-coach";

type Client = Awaited<ReturnType<typeof createClient>>;

export async function getCoachReportForMeeting(
  supabase: Client,
  meetingId: string
): Promise<CoachReport | null> {
  const { data } = await supabase
    .from("meeting_coach_reports")
    .select("meeting_id, score, metrics, suggestions, created_at")
    .eq("meeting_id", meetingId)
    .maybeSingle<{
      meeting_id: string;
      score: number;
      metrics: unknown;
      suggestions: unknown;
      created_at: string;
    }>();

  if (!data) return null;

  return {
    meeting_id: data.meeting_id,
    score: data.score,
    metrics: (data.metrics ?? {}) as Record<string, number>,
    suggestions: (data.suggestions ?? []) as CoachReport["suggestions"],
    created_at: data.created_at,
  };
}
