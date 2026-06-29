import type { createClient } from "@/lib/supabase/server";
import type { Meeting } from "@/lib/supabase/types";
import type { MeetingSeries } from "@/lib/workflow/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export async function getMeetingSeriesList(supabase: Client): Promise<MeetingSeries[]> {
  const { data, error } = await supabase
    .from("meetings")
    .select("calendar_recurring_event_id, title, started_at")
    .not("calendar_recurring_event_id", "is", null)
    .order("started_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as Pick<
    Meeting,
    "calendar_recurring_event_id" | "title" | "started_at"
  >[];

  const groups = new Map<string, { title: string; dates: string[] }>();

  for (const row of rows) {
    const recurringId = row.calendar_recurring_event_id;
    const title = row.title;
    const startedAt = row.started_at;
    if (!recurringId) continue;

    const existing = groups.get(recurringId);
    if (existing) {
      existing.dates.push(startedAt);
      if (title.length > existing.title.length) existing.title = title;
    } else {
      groups.set(recurringId, { title, dates: [startedAt] });
    }
  }

  return [...groups.entries()]
    .map(([recurringEventId, group]) => ({
      recurringEventId,
      title: group.title,
      meetingCount: group.dates.length,
      lastStartedAt: group.dates[0]!,
      firstStartedAt: group.dates[group.dates.length - 1]!,
    }))
    .filter((series) => series.meetingCount >= 2)
    .sort((a, b) => new Date(b.lastStartedAt).getTime() - new Date(a.lastStartedAt).getTime());
}

export async function getMeetingsInSeries(
  supabase: Client,
  recurringEventId: string
): Promise<Meeting[]> {
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .eq("calendar_recurring_event_id", recurringEventId)
    .order("started_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Meeting[];
}
