import type { createClient } from "@/lib/supabase/server";
import type { ActionItem, Meeting } from "@/lib/supabase/types";
import { getMeetingDurationMs } from "@/lib/meetings/types";

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

export async function getMeetingsForUser(supabase: Client, limit = 50): Promise<Meeting[]> {
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
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

export async function getDashboardData(supabase: Client): Promise<DashboardData> {
  const [stats, recentMeetings, attentionItems] = await Promise.all([
    getDashboardStats(supabase),
    getMeetingsForUser(supabase, 5),
    getOpenActionItems(supabase, 5),
  ]);

  return { stats, recentMeetings, attentionItems };
}
