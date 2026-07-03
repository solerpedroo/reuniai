import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { isLlmConfigured } from "@/lib/llm/client";
import { analyzeMeetingCoach } from "@/lib/llm/meeting-coach";
import { getMeetingDurationMs } from "@/lib/meetings/types";

type AdminClient = ReturnType<typeof createAdminClient>;

export type CoachReport = {
  meeting_id: string;
  score: number;
  metrics: Record<string, number>;
  suggestions: { title: string; detail: string; priority: string }[];
  created_at: string;
};

export async function generateAndSaveCoachReport(
  admin: AdminClient,
  meetingId: string,
  transcript: string
): Promise<CoachReport | null> {
  if (!isLlmConfigured()) return null;

  const { data: meeting } = await admin
    .from("meetings")
    .select("id, user_id, title, started_at, ended_at, duration_ms")
    .eq("id", meetingId)
    .maybeSingle();

  if (!meeting) return null;

  const durationMs = meeting.duration_ms ?? getMeetingDurationMs(meeting);
  const durationMinutes = durationMs ? Math.round(durationMs / 60_000) : null;

  const report = await analyzeMeetingCoach({
    transcript,
    meetingTitle: meeting.title,
    durationMinutes,
  });

  const payload: Database["public"]["Tables"]["meeting_coach_reports"]["Insert"] = {
    meeting_id: meetingId,
    user_id: meeting.user_id,
    score: report.score,
    metrics: report.metrics as Database["public"]["Tables"]["meeting_coach_reports"]["Insert"]["metrics"],
    suggestions: report.suggestions as Database["public"]["Tables"]["meeting_coach_reports"]["Insert"]["suggestions"],
  };

  const { data, error } = await admin
    .from("meeting_coach_reports")
    .upsert(payload, { onConflict: "meeting_id" })
    .select("meeting_id, score, metrics, suggestions, created_at")
    .single();

  if (error || !data) throw error ?? new Error("Falha ao salvar coach report");

  return {
    meeting_id: data.meeting_id,
    score: data.score,
    metrics: (data.metrics ?? {}) as Record<string, number>,
    suggestions: (data.suggestions ?? []) as CoachReport["suggestions"],
    created_at: data.created_at,
  };
}
