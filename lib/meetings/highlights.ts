import "server-only";

import type { createClient } from "@/lib/supabase/server";
import type { MeetingHighlight } from "@/lib/workflow/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export async function getMeetingHighlights(
  supabase: Client,
  meetingId: string
): Promise<MeetingHighlight[]> {
  const { data, error } = await supabase
    .from("meeting_highlights")
    .select("*")
    .eq("meeting_id", meetingId)
    .order("start_ms", { ascending: true });

  if (error) throw error;
  return (data ?? []) as MeetingHighlight[];
}
