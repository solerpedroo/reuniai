import "server-only";

import type { ComparePickerMeeting } from "@/lib/meetings/compare-picker-types";
import type { createClient } from "@/lib/supabase/server";
import type { Meeting } from "@/lib/supabase/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export type { ComparePickerMeeting } from "@/lib/meetings/compare-picker-types";

export async function getComparePickerMeetings(
  supabase: Client,
  options: { seriesId?: string; limit?: number } = {}
): Promise<ComparePickerMeeting[]> {
  const limit = options.limit ?? 50;

  let query = supabase
    .from("meetings")
    .select("id, title, started_at, calendar_recurring_event_id")
    .in("status", ["completed", "partial"])
    .order("started_at", { ascending: false })
    .limit(limit);

  if (options.seriesId) {
    query = query.eq("calendar_recurring_event_id", options.seriesId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => {
    const meeting = row as Pick<
      Meeting,
      "id" | "title" | "started_at" | "calendar_recurring_event_id"
    >;
    return {
      id: meeting.id,
      title: meeting.title,
      startedAt: meeting.started_at,
      seriesId: meeting.calendar_recurring_event_id,
    };
  });
}

export function pickLastTwoMeetings(
  meetings: ComparePickerMeeting[]
): [ComparePickerMeeting, ComparePickerMeeting] | null {
  if (meetings.length < 2) return null;
  return [meetings[0]!, meetings[1]!];
}
