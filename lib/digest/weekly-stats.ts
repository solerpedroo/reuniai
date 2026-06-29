import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { parseDecisions } from "@/lib/meetings/insights";
import { getMeetingDurationMs } from "@/lib/meetings/types";
import type { ActionItem, Meeting, MeetingSummary } from "@/lib/supabase/types";

type AdminClient = ReturnType<typeof createAdminClient>;

export type WeeklyDigestStats = {
  meetingCount: number;
  hoursRecordedMs: number;
  topDecisions: string[];
  dueActionItems: Pick<ActionItem, "title" | "assignee" | "due_date" | "meeting_id">[];
};

function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

export async function getWeeklyDigestStats(
  admin: AdminClient,
  userId: string,
  now = new Date()
): Promise<WeeklyDigestStats> {
  const weekStart = startOfWeek(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const { data: meetings } = await admin
    .from("meetings")
    .select("id, duration_ms, started_at, ended_at, status")
    .eq("user_id", userId)
    .gte("started_at", weekStart.toISOString())
    .lt("started_at", weekEnd.toISOString())
    .in("status", ["completed", "partial"]);

  const meetingRows = (meetings ?? []) as Meeting[];
  const meetingIds = meetingRows.map((m) => m.id);

  const hoursRecordedMs = meetingRows.reduce(
    (acc, meeting) => acc + (getMeetingDurationMs(meeting) ?? 0),
    0
  );

  let topDecisions: string[] = [];
  if (meetingIds.length > 0) {
    const { data: summaries } = await admin
      .from("meeting_summaries")
      .select("decisions")
      .in("meeting_id", meetingIds);

    const allDecisions: string[] = [];
    for (const row of summaries ?? []) {
      allDecisions.push(...parseDecisions((row as MeetingSummary).decisions ?? []));
    }
    topDecisions = [...new Set(allDecisions)].slice(0, 5);
  }

  const dueEnd = new Date(now);
  dueEnd.setDate(dueEnd.getDate() + 7);
  const dueEndIso = dueEnd.toISOString().slice(0, 10);
  const todayIso = now.toISOString().slice(0, 10);

  const { data: dueItems } = await admin
    .from("action_items")
    .select("title, assignee, due_date, meeting_id")
    .eq("user_id", userId)
    .eq("status", "open")
    .not("due_date", "is", null)
    .lte("due_date", dueEndIso)
    .gte("due_date", todayIso)
    .order("due_date", { ascending: true })
    .limit(8);

  return {
    meetingCount: meetingRows.length,
    hoursRecordedMs,
    topDecisions,
    dueActionItems: (dueItems ?? []) as Pick<
      ActionItem,
      "title" | "assignee" | "due_date" | "meeting_id"
    >[],
  };
}
