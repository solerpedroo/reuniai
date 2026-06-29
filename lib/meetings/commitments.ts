import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { isLlmConfigured } from "@/lib/llm/client";
import { detectCommitments } from "@/lib/llm/commitment-detection";

type AdminClient = ReturnType<typeof createAdminClient>;
type ActionItemInsert = Database["public"]["Tables"]["action_items"]["Insert"];

export async function detectAndSaveCommitments(
  admin: AdminClient,
  meetingId: string,
  transcript: string,
  existingTitles: string[]
): Promise<number> {
  if (!isLlmConfigured()) return 0;

  const { data: meeting } = await admin
    .from("meetings")
    .select("id, user_id, title, started_at, ended_at")
    .eq("id", meetingId)
    .maybeSingle();

  if (!meeting) return 0;

  const referenceDateIso = meeting.ended_at ?? meeting.started_at;

  await admin
    .from("action_items")
    .delete()
    .eq("meeting_id", meetingId)
    .eq("status", "suggested");

  const result = await detectCommitments({
    transcript,
    meetingTitle: meeting.title,
    referenceDateIso,
    existingActionItemTitles: existingTitles,
  });

  if (result.commitments.length === 0) return 0;

  const rows: ActionItemInsert[] = result.commitments.map((item) => ({
    meeting_id: meetingId,
    user_id: meeting.user_id,
    title: item.title,
    assignee: item.assignee,
    due_date: item.due_date,
    source: "ai",
    status: "suggested",
  }));

  const { error } = await admin.from("action_items").insert(rows);
  if (error) throw error;

  return rows.length;
}
