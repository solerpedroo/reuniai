import type { createClient } from "@/lib/supabase/server";
import type { ActionItem, Meeting } from "@/lib/supabase/types";
import { getMeetingDurationMs } from "@/lib/meetings/types";
import { toIlikeContainsPattern } from "@/lib/search/escape-ilike";

type Client = Awaited<ReturnType<typeof createClient>>;

export type DashboardStats = {
  meetingsThisMonth: number;
  meetingsLastMonth: number;
  hoursRecordedMs: number;
  openActionItems: number;
  nextMeeting: Pick<Meeting, "id" | "title" | "started_at"> | null;
};

export type DashboardData = {
  stats: DashboardStats;
  recentMeetings: Meeting[];
  attentionItems: ActionItem[];
};

export type MeetingsCursor = {
  startedAt: string;
  id: string;
};

export type MeetingsPage = {
  meetings: Meeting[];
  nextCursor: MeetingsCursor | null;
};

function dedupeMeetings(meetings: Meeting[]): Meeting[] {
  const seen = new Set<string>();
  return meetings.filter((meeting) => {
    if (seen.has(meeting.id)) return false;
    seen.add(meeting.id);
    return true;
  });
}

function sortMeetingsDesc(meetings: Meeting[]): Meeting[] {
  return [...meetings].sort((a, b) => {
    const dateDiff = new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
    if (dateDiff !== 0) return dateDiff;
    return b.id.localeCompare(a.id);
  });
}

export async function getMeetingsForUser(supabase: Client, limit = 50): Promise<Meeting[]> {
  const page = await getMeetingsForUserPaginated(supabase, { limit });
  return page.meetings;
}

export async function getMeetingsForUserPaginated(
  supabase: Client,
  options: { limit?: number; cursor?: MeetingsCursor } = {}
): Promise<MeetingsPage> {
  const limit = options.limit ?? 50;

  let query = supabase
    .from("meetings")
    .select("*")
    .order("started_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (options.cursor) {
    const { startedAt, id } = options.cursor;
    query = query.or(`started_at.lt.${startedAt},and(started_at.eq.${startedAt},id.lt.${id})`);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as Meeting[];
  const hasMore = rows.length > limit;
  const meetings = hasMore ? rows.slice(0, limit) : rows;
  const last = meetings.at(-1);

  return {
    meetings,
    nextCursor:
      hasMore && last
        ? { startedAt: last.started_at, id: last.id }
        : null,
  };
}

export async function searchMeetings(
  supabase: Client,
  term: string,
  options: { limit?: number; cursor?: MeetingsCursor } = {}
): Promise<MeetingsPage> {
  const query = term.trim();
  if (!query) {
    return getMeetingsForUserPaginated(supabase, options);
  }

  const limit = options.limit ?? 50;
  const pattern = toIlikeContainsPattern(query);

  const [titleRes, segmentRes] = await Promise.all([
    supabase.from("meetings").select("*").ilike("title", pattern),
    supabase
      .from("transcript_segments")
      .select("meeting_id")
      .ilike("text", pattern)
      .limit(1000),
  ]);

  if (titleRes.error) throw titleRes.error;
  if (segmentRes.error) throw segmentRes.error;

  const segmentIds = [
    ...new Set(
      ((segmentRes.data ?? []) as { meeting_id: string }[]).map((row) => row.meeting_id)
    ),
  ];

  let segmentMeetings: Meeting[] = [];
  if (segmentIds.length > 0) {
    const { data, error } = await supabase.from("meetings").select("*").in("id", segmentIds);
    if (error) throw error;
    segmentMeetings = (data ?? []) as Meeting[];
  }

  let merged = sortMeetingsDesc(
    dedupeMeetings([...((titleRes.data ?? []) as Meeting[]), ...segmentMeetings])
  );

  if (options.cursor) {
    const { startedAt, id } = options.cursor;
    merged = merged.filter((meeting) => {
      const meetingTime = new Date(meeting.started_at).getTime();
      const cursorTime = new Date(startedAt).getTime();
      if (meetingTime < cursorTime) return true;
      if (meetingTime > cursorTime) return false;
      return meeting.id < id;
    });
  }

  const hasMore = merged.length > limit;
  const meetings = hasMore ? merged.slice(0, limit) : merged;
  const last = meetings.at(-1);

  return {
    meetings,
    nextCursor:
      hasMore && last
        ? { startedAt: last.started_at, id: last.id }
        : null,
  };
}

export async function getMeetingById(supabase: Client, id: string): Promise<Meeting | null> {
  const { data, error } = await supabase.from("meetings").select("*").eq("id", id).maybeSingle();

  if (error) throw error;
  return data;
}

export async function getOpenActionItems(
  supabase: Client,
  limit = 5
): Promise<ActionItem[]> {
  const { data, error } = await supabase
    .from("action_items")
    .select("*")
    .eq("status", "open")
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

async function countMeetingsBetween(supabase: Client, fromIso: string, toIso?: string) {
  let query = supabase
    .from("meetings")
    .select("id", { count: "exact", head: true })
    .gte("started_at", fromIso);

  if (toIso) query = query.lt("started_at", toIso);

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function getDashboardStats(supabase: Client): Promise<DashboardStats> {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const [meetingsThisMonth, meetingsLastMonth, openCount, processed, next] = await Promise.all([
    countMeetingsBetween(supabase, monthStart.toISOString()),
    countMeetingsBetween(supabase, lastMonthStart.toISOString(), monthStart.toISOString()),
    supabase
      .from("action_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    supabase
      .from("meetings")
      .select("duration_ms, started_at, ended_at")
      .in("status", ["completed", "partial"]),
    supabase
      .from("meetings")
      .select("id, title, started_at")
      .in("status", ["scheduled", "bot_joining"])
      .gte("started_at", now.toISOString())
      .order("started_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  if (openCount.error) throw openCount.error;
  if (processed.error) throw processed.error;
  if (next.error) throw next.error;

  const hoursRecordedMs = (processed.data ?? []).reduce(
    (acc, m) => acc + (getMeetingDurationMs(m) ?? 0),
    0
  );

  return {
    meetingsThisMonth,
    meetingsLastMonth,
    hoursRecordedMs,
    openActionItems: openCount.count ?? 0,
    nextMeeting: next.data ?? null,
  };
}

export type WeeklyMeetingCount = {
  weekLabel: string;
  count: number;
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

export async function getMeetingsWeeklyChart(
  supabase: Client,
  weeks = 8
): Promise<WeeklyMeetingCount[]> {
  const now = new Date();
  const currentWeekStart = startOfWeek(now);
  const rangeStart = new Date(currentWeekStart);
  rangeStart.setDate(rangeStart.getDate() - (weeks - 1) * 7);

  const { data, error } = await supabase
    .from("meetings")
    .select("started_at")
    .gte("started_at", rangeStart.toISOString());

  if (error) throw error;

  const buckets = Array.from({ length: weeks }, (_, index) => {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(weekStart.getDate() - (weeks - 1 - index) * 7);
    return {
      weekStart,
      weekLabel: formatWeekLabel(weekStart),
      count: 0,
    };
  });

  for (const row of data ?? []) {
    const startedAt = new Date((row as { started_at: string }).started_at);
    const weekStart = startOfWeek(startedAt).getTime();
    const bucket = buckets.find((item) => item.weekStart.getTime() === weekStart);
    if (bucket) bucket.count += 1;
  }

  return buckets.map(({ weekLabel, count }) => ({ weekLabel, count }));
}

export async function getDashboardData(supabase: Client): Promise<DashboardData> {
  const [stats, recentMeetings, attentionItems] = await Promise.all([
    getDashboardStats(supabase),
    getMeetingsForUser(supabase, 5),
    getOpenActionItems(supabase, 5),
  ]);

  return { stats, recentMeetings, attentionItems };
}
