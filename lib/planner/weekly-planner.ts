import "server-only";

import type { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { getInboxActionItems, getInboxCounts } from "@/lib/meetings/action-items-inbox";
import { getReviewQueue } from "@/lib/review/review-queue";
import {
  formatWeekRangeLabel,
  isCurrentWeekKey,
  parseWeekKey,
  weekRangeFromKey,
} from "@/lib/review/week-utils";
import { resolveTimezone } from "@/lib/timezone/local-date";
import type { Meeting } from "@/lib/supabase/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export type WeeklyPlannerData = {
  weekKey: string;
  weekLabel: string;
  isCurrentWeek: boolean;
  timezone: string;
  reviewPending: number;
  reviewItems: { id: string; title: string; started_at: string }[];
  inboxFocus: number;
  inboxOverdue: number;
  topTasks: { id: string; title: string; due_date: string | null; meetingTitle: string | null }[];
  upcomingMeetings: Pick<Meeting, "id" | "title" | "started_at">[];
  intention: string;
};

export async function getWeeklyPlannerData(
  supabase: Client,
  options: { weekKey?: string; now?: Date } = {}
): Promise<WeeklyPlannerData> {
  const now = options.now ?? new Date();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("timezone")
        .eq("id", user.id)
        .maybeSingle<{ timezone: string | null }>()
    : { data: null };

  const timezone = resolveTimezone(profile?.timezone);
  const weekKey = parseWeekKey(options.weekKey, timezone, now);
  const { start, end } = weekRangeFromKey(weekKey);

  if (!user) {
    return {
      weekKey,
      weekLabel: formatWeekRangeLabel(weekKey, timezone),
      isCurrentWeek: isCurrentWeekKey(weekKey, timezone, now),
      timezone,
      reviewPending: 0,
      reviewItems: [],
      inboxFocus: 0,
      inboxOverdue: 0,
      topTasks: [],
      upcomingMeetings: [],
      intention: "",
    };
  }

  const [review, inboxCounts, inboxItems, upcomingRes, intentionRes] = await Promise.all([
    getReviewQueue(supabase, { limit: 5 }),
    getInboxCounts(supabase),
    getInboxActionItems(supabase, { filter: "focus" }),
    supabase
      .from("meetings")
      .select("id, title, started_at")
      .eq("user_id", user.id)
      .gte("started_at", start.toISOString())
      .lte("started_at", end.toISOString())
      .in("status", ["scheduled", "bot_joining", "recording", "completed"])
      .order("started_at", { ascending: true })
      .limit(8),
    supabase
      .from("user_weekly_intentions")
      .select("intention")
      .eq("user_id", user.id)
      .eq("week_key", weekKey)
      .maybeSingle<{ intention: string }>(),
  ]);

  return {
    weekKey,
    weekLabel: formatWeekRangeLabel(weekKey, timezone),
    isCurrentWeek: isCurrentWeekKey(weekKey, timezone, now),
    timezone,
    reviewPending: review.counts.pending,
    reviewItems: review.items.map((m) => ({
      id: m.id,
      title: m.title,
      started_at: m.started_at,
    })),
    inboxFocus: inboxCounts.focus,
    inboxOverdue: inboxCounts.overdue,
    topTasks: inboxItems.slice(0, 6).map((item) => ({
      id: item.id,
      title: item.title,
      due_date: item.due_date,
      meetingTitle: item.meeting_title ?? null,
    })),
    upcomingMeetings: (upcomingRes.data ?? []) as Pick<Meeting, "id" | "title" | "started_at">[],
    intention: intentionRes.data?.intention ?? "",
  };
}

export async function saveWeeklyIntention(
  userId: string,
  weekKey: string,
  intention: string
): Promise<void> {
  const admin = createAdminClient();
  const payload: Database["public"]["Tables"]["user_weekly_intentions"]["Insert"] = {
    user_id: userId,
    week_key: weekKey,
    intention,
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin.from("user_weekly_intentions").upsert(payload, {
    onConflict: "user_id,week_key",
  });

  if (error) throw error;
}
