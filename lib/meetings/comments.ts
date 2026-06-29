import "server-only";

import type { createClient } from "@/lib/supabase/server";
import type { MeetingComment } from "@/lib/workflow/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export async function getMeetingComments(
  supabase: Client,
  meetingId: string
): Promise<MeetingComment[]> {
  const { data, error } = await supabase
    .from("meeting_comments")
    .select("*")
    .eq("meeting_id", meetingId)
    .order("start_ms", { ascending: true });

  if (error) throw error;
  return (data ?? []) as MeetingComment[];
}
