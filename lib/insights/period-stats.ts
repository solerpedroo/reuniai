import type { createClient } from "@/lib/supabase/server";
import { parseDecisions } from "@/lib/meetings/insights";
import { getMeetingDurationMs } from "@/lib/meetings/types";
import type { Meeting, MeetingSummary } from "@/lib/supabase/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export type InsightPeriod = "7d" | "30d" | "90d" | "12m";

export const INSIGHT_PERIODS: { value: InsightPeriod; label: string }[] = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
  { value: "12m", label: "12 meses" },
];

export type WeeklyHoursPoint = {
  weekLabel: string;
  hours: number;
  meetings: number;
};

export type TopParticipant = {
  label: string;
  count: number;
};

export type PeriodInsights = {
  period: InsightPeriod;
  meetingCount: number;
  hoursRecordedMs: number;
  weeklyHours: WeeklyHoursPoint[];
  taskCompletionRate: number | null;
  openTasksInPeriod: number;
  doneTasksInPeriod: number;
  topDecisions: string[];
  topParticipants: TopParticipant[];
  avgReviewHours: number | null;
  reviewedMeetingsCount: number;
};

function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function formatWeekLabel(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date);
}

export function parseInsightPeriod(value: string | undefined): InsightPeriod {
  if (value === "7d" || value === "30d" || value === "90d" || value === "12m") {
    return value;
  }
  return "30d";
}

export function periodToRange(period: InsightPeriod, now = new Date()): { start: Date; end: Date } {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case "7d":
      start.setDate(start.getDate() - 6);
      break;
    case "30d":
      start.setDate(start.getDate() - 29);
      break;
    case "90d":
      start.setDate(start.getDate() - 89);
      break;
    case "12m":
      start.setMonth(start.getMonth() - 11);
      start.setDate(1);
      break;
  }

  return { start, end };
}

function weekCountForPeriod(period: InsightPeriod): number {
  switch (period) {
    case "7d":
      return 1;
    case "30d":
      return 5;
    case "90d":
      return 13;
    case "12m":
      return 52;
    default:
      return 5;
  }
}

function buildWeeklyBuckets(
  period: InsightPeriod,
  rangeStart: Date,
  rangeEnd: Date
): WeeklyHoursPoint[] {
  const weeks = weekCountForPeriod(period);
  const endWeek = startOfWeek(rangeEnd);
  const buckets: WeeklyHoursPoint[] = [];

  for (let index = weeks - 1; index >= 0; index -= 1) {
    const weekStart = new Date(endWeek);
    weekStart.setDate(weekStart.getDate() - index * 7);
    if (weekStart < rangeStart) continue;
    buckets.push({
      weekLabel: formatWeekLabel(weekStart),
      hours: 0,
      meetings: 0,
    });
  }

  return buckets.length > 0
    ? buckets
    : [{ weekLabel: formatWeekLabel(endWeek), hours: 0, meetings: 0 }];
}

function topDecisionsFromSummaries(
  summaries: Pick<MeetingSummary, "decisions">[]
): string[] {
  const counts = new Map<string, number>();
  for (const row of summaries) {
    for (const decision of parseDecisions(row.decisions ?? [])) {
      const key = decision.trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([text]) => text);
}

export async function getInsightsForPeriod(
  supabase: Client,
  period: InsightPeriod,
  now = new Date()
): Promise<PeriodInsights> {
  const { start, end } = periodToRange(period, now);
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const { data: meetings, error: meetingsError } = await supabase
    .from("meetings")
    .select("id, duration_ms, started_at, ended_at, status, meeting_reviewed_at")
    .gte("started_at", startIso)
    .lte("started_at", endIso)
    .in("status", ["completed", "partial"]);

  if (meetingsError) throw meetingsError;

  const meetingRows = (meetings ?? []) as Meeting[];
  const meetingIds = meetingRows.map((m) => m.id);

  const hoursRecordedMs = meetingRows.reduce(
    (acc, meeting) => acc + (getMeetingDurationMs(meeting) ?? 0),
    0
  );

  const weeklyHours = buildWeeklyBuckets(period, start, end);
  for (const meeting of meetingRows) {
    const weekStart = startOfWeek(new Date(meeting.started_at));
    const label = formatWeekLabel(weekStart);
    const bucket = weeklyHours.find((item) => item.weekLabel === label);
    if (!bucket) continue;
    bucket.meetings += 1;
    bucket.hours += (getMeetingDurationMs(meeting) ?? 0) / 3_600_000;
  }

  for (const bucket of weeklyHours) {
    bucket.hours = Math.round(bucket.hours * 10) / 10;
  }

  const { data: actionItems, error: itemsError } = await supabase
    .from("action_items")
    .select("status, created_at")
    .gte("created_at", startIso)
    .lte("created_at", endIso);

  if (itemsError) throw itemsError;

  const items = (actionItems ?? []) as { status: string; created_at: string }[];
  const doneTasksInPeriod = items.filter((item) => item.status === "done").length;
  const openTasksInPeriod = items.filter((item) => item.status === "open").length;
  const totalTasks = doneTasksInPeriod + openTasksInPeriod;
  const taskCompletionRate =
    totalTasks > 0 ? Math.round((doneTasksInPeriod / totalTasks) * 100) / 100 : null;

  let topDecisions: string[] = [];
  if (meetingIds.length > 0) {
    const { data: summaries, error: summaryError } = await supabase
      .from("meeting_summaries")
      .select("decisions")
      .in("meeting_id", meetingIds);

    if (summaryError) throw summaryError;
    topDecisions = topDecisionsFromSummaries(
      (summaries ?? []) as Pick<MeetingSummary, "decisions">[]
    );
  }

  let topParticipants: TopParticipant[] = [];
  if (meetingIds.length > 0) {
    const { data: participants, error: participantsError } = await supabase
      .from("participants")
      .select("name, email, meeting_id")
      .in("meeting_id", meetingIds);

    if (participantsError) throw participantsError;

    const counts = new Map<string, number>();
    for (const row of participants ?? []) {
      const participant = row as { name: string | null; email: string | null };
      const label = participant.email?.trim() || participant.name?.trim() || "Desconhecido";
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }

    topParticipants = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label, count }));
  }

  const reviewDeltasHours: number[] = [];
  for (const meeting of meetingRows) {
    if (!meeting.meeting_reviewed_at || !meeting.ended_at) continue;
    const reviewed = new Date(meeting.meeting_reviewed_at).getTime();
    const ended = new Date(meeting.ended_at).getTime();
    if (reviewed >= ended) {
      reviewDeltasHours.push((reviewed - ended) / 3_600_000);
    }
  }

  const avgReviewHours =
    reviewDeltasHours.length > 0
      ? Math.round(
          (reviewDeltasHours.reduce((a, b) => a + b, 0) / reviewDeltasHours.length) * 10
        ) / 10
      : null;

  return {
    period,
    meetingCount: meetingRows.length,
    hoursRecordedMs,
    weeklyHours,
    taskCompletionRate,
    openTasksInPeriod,
    doneTasksInPeriod,
    topDecisions,
    topParticipants,
    avgReviewHours,
    reviewedMeetingsCount: reviewDeltasHours.length,
  };
}
