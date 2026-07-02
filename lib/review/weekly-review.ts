import type { createClient } from "@/lib/supabase/server";
import { parseDecisions } from "@/lib/meetings/insights";
import { getMeetingDurationMs } from "@/lib/meetings/types";
import {
  formatWeekRangeLabel,
  isCurrentWeekKey,
  localDateIsoInTimezone,
  parseWeekKey,
  weekRangeFromKey,
} from "@/lib/review/week-utils";
import { resolveTimezone } from "@/lib/timezone/local-date";
import type { ActionItem, Meeting, MeetingSummary } from "@/lib/supabase/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export type WeeklyReviewMeeting = Pick<Meeting, "id" | "title" | "started_at">;

export type WeeklyReviewTask = Pick<
  ActionItem,
  "id" | "title" | "assignee" | "due_date" | "meeting_id" | "snoozed_until" | "status"
> & {
  meetingTitle?: string | null;
};

export type WeeklyReviewData = {
  weekKey: string;
  weekLabel: string;
  isCurrentWeek: boolean;
  timezone: string;
  meetingCount: number;
  hoursRecordedMs: number;
  taskCompletionRate: number | null;
  openTasksDone: number;
  openTasksTotal: number;
  unreviewedMeetings: WeeklyReviewMeeting[];
  overdueTasks: WeeklyReviewTask[];
  dueNextWeekTasks: WeeklyReviewTask[];
  topDecisions: string[];
  upcomingMeetings: WeeklyReviewMeeting[];
};

function isSnoozed(item: Pick<ActionItem, "snoozed_until">, now: Date): boolean {
  return item.snoozed_until != null && new Date(item.snoozed_until) > now;
}

function localDateIso(date: Date, timezone: string): string {
  return localDateIsoInTimezone(date, timezone);
}

export async function getWeeklyReview(
  supabase: Client,
  options: { weekKey?: string; now?: Date } = {}
): Promise<WeeklyReviewData> {
  const now = options.now ?? new Date();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const timezone = resolveTimezone(null);
    const weekKey = parseWeekKey(options.weekKey, timezone, now);
    return {
      weekKey,
      weekLabel: formatWeekRangeLabel(weekKey, timezone),
      isCurrentWeek: isCurrentWeekKey(weekKey, timezone, now),
      timezone,
      meetingCount: 0,
      hoursRecordedMs: 0,
      taskCompletionRate: null,
      openTasksDone: 0,
      openTasksTotal: 0,
      unreviewedMeetings: [],
      overdueTasks: [],
      dueNextWeekTasks: [],
      topDecisions: [],
      upcomingMeetings: [],
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .maybeSingle<{ timezone: string | null }>();

  const timezone = resolveTimezone(profile?.timezone);
  const weekKey = parseWeekKey(options.weekKey, timezone, now);
  const { start: weekStart, end: weekEnd } = weekRangeFromKey(weekKey);
  const nextWeekEnd = new Date(weekEnd);
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);

  const weekStartIso = localDateIso(weekStart, timezone);
  const weekEndIso = localDateIso(new Date(weekEnd.getTime() - 1), timezone);
  const nextWeekEndIso = localDateIso(new Date(nextWeekEnd.getTime() - 1), timezone);
  const todayIso = localDateIso(now, timezone);

  const [
    meetingsRes,
    unreviewedRes,
    tasksRes,
    upcomingRes,
  ] = await Promise.all([
    supabase
      .from("meetings")
      .select("id, duration_ms, started_at, ended_at, status")
      .gte("started_at", weekStart.toISOString())
      .lt("started_at", weekEnd.toISOString())
      .in("status", ["completed", "partial"]),
    supabase
      .from("meetings")
      .select("id, title, started_at")
      .eq("status", "completed")
      .is("meeting_reviewed_at", null)
      .gte("started_at", weekStart.toISOString())
      .lt("started_at", weekEnd.toISOString())
      .order("started_at", { ascending: false }),
    supabase
      .from("action_items")
      .select("id, title, assignee, due_date, meeting_id, snoozed_until, status, updated_at, meetings(title)")
      .in("status", ["open", "done"])
      .not("due_date", "is", null)
      .gte("due_date", weekStartIso)
      .lte("due_date", nextWeekEndIso),
    supabase
      .from("meetings")
      .select("id, title, started_at")
      .gte("started_at", weekEnd.toISOString())
      .lt("started_at", nextWeekEnd.toISOString())
      .in("status", ["scheduled", "bot_joining", "recording"])
      .order("started_at", { ascending: true })
      .limit(8),
  ]);

  if (meetingsRes.error) throw meetingsRes.error;
  if (unreviewedRes.error) throw unreviewedRes.error;
  if (tasksRes.error) throw tasksRes.error;
  if (upcomingRes.error) throw upcomingRes.error;

  const meetingRows = (meetingsRes.data ?? []) as Meeting[];
  const meetingIds = meetingRows.map((m) => m.id);

  const hoursRecordedMs = meetingRows.reduce(
    (acc, meeting) => acc + (getMeetingDurationMs(meeting) ?? 0),
    0
  );

  let topDecisions: string[] = [];
  if (meetingIds.length > 0) {
    const { data: summaries } = await supabase
      .from("meeting_summaries")
      .select("decisions")
      .in("meeting_id", meetingIds);

    const allDecisions: string[] = [];
    for (const row of summaries ?? []) {
      allDecisions.push(...parseDecisions((row as MeetingSummary).decisions ?? []));
    }
    topDecisions = [...new Set(allDecisions)].slice(0, 8);
  }

  type TaskRow = WeeklyReviewTask & {
    meetings: { title: string } | { title: string }[] | null;
  };

  const tasks = ((tasksRes.data ?? []) as TaskRow[])
    .filter((task) => !isSnoozed(task, now))
    .map((task) => {
      const meeting = task.meetings;
      const meetingTitle = Array.isArray(meeting) ? meeting[0]?.title : meeting?.title;
      return { ...task, meetingTitle: meetingTitle ?? null };
    });

  const overdueTasks = tasks.filter(
    (task) =>
      task.status === "open" &&
      task.due_date != null &&
      task.due_date >= weekStartIso &&
      task.due_date <= weekEndIso &&
      task.due_date < todayIso
  );

  const dueNextWeekTasks = tasks.filter(
    (task) =>
      task.status === "open" &&
      task.due_date != null &&
      task.due_date > weekEndIso &&
      task.due_date <= nextWeekEndIso
  );

  const weekTasks = tasks.filter(
    (task) => task.due_date != null && task.due_date >= weekStartIso && task.due_date <= weekEndIso
  );
  const openTasksTotal = weekTasks.length;
  const openTasksDone = weekTasks.filter((task) => task.status === "done").length;
  const taskCompletionRate =
    openTasksTotal > 0 ? Math.round((openTasksDone / openTasksTotal) * 100) : null;

  return {
    weekKey,
    weekLabel: formatWeekRangeLabel(weekKey, timezone),
    isCurrentWeek: isCurrentWeekKey(weekKey, timezone, now),
    timezone,
    meetingCount: meetingRows.length,
    hoursRecordedMs,
    taskCompletionRate,
    openTasksDone,
    openTasksTotal,
    unreviewedMeetings: (unreviewedRes.data ?? []) as WeeklyReviewMeeting[],
    overdueTasks,
    dueNextWeekTasks,
    topDecisions,
    upcomingMeetings: (upcomingRes.data ?? []) as WeeklyReviewMeeting[],
  };
}
