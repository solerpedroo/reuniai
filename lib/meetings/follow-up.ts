import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { parseDecisions } from "@/lib/meetings/insights";
import { generateFollowUpDraft } from "@/lib/llm/follow-up-draft";
import { isLlmConfigured } from "@/lib/llm/client";
import type { MeetingFollowUp } from "@/lib/workflow/types";
import type { ActionItem, MeetingSummary } from "@/lib/supabase/types";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function getFollowUpForMeeting(
  admin: AdminClient,
  meetingId: string
): Promise<MeetingFollowUp | null> {
  const { data, error } = await admin
    .from("meeting_follow_ups")
    .select("*")
    .eq("meeting_id", meetingId)
    .maybeSingle();

  if (error) throw error;
  return (data as MeetingFollowUp | null) ?? null;
}

export async function generateAndSaveFollowUp(
  admin: AdminClient,
  meetingId: string
): Promise<MeetingFollowUp | null> {
  if (!isLlmConfigured()) return null;

  const { data: meeting } = await admin
    .from("meetings")
    .select("id, user_id, title, status")
    .eq("id", meetingId)
    .maybeSingle();

  if (!meeting || meeting.status !== "completed") return null;

  const [summaryRes, actionItemsRes] = await Promise.all([
    admin
      .from("meeting_summaries")
      .select("*")
      .eq("meeting_id", meetingId)
      .maybeSingle<MeetingSummary>(),
    admin
      .from("action_items")
      .select("title, assignee, due_date")
      .eq("meeting_id", meetingId)
      .order("created_at", { ascending: true }),
  ]);

  const summary = summaryRes.data;
  const actionItems = (actionItemsRes.data ?? []) as Pick<
    ActionItem,
    "title" | "assignee" | "due_date"
  >[];

  const draft = await generateFollowUpDraft({
    meetingTitle: meeting.title,
    executiveSummary: summary?.executive_summary,
    decisions: parseDecisions(summary?.decisions ?? []),
    actionItems,
  });

  const { data, error } = await admin
    .from("meeting_follow_ups")
    .upsert(
      {
        meeting_id: meetingId,
        user_id: meeting.user_id,
        subject: draft.subject,
        body: draft.body,
      },
      { onConflict: "meeting_id" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return data as MeetingFollowUp;
}
