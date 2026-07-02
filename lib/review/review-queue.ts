import type { createClient } from "@/lib/supabase/server";
import { isReviewSnoozed } from "@/lib/review/review-snooze";
import { localDateIsoInTimezone, resolveTimezone } from "@/lib/timezone/local-date";
import type { ActionItem, Meeting } from "@/lib/supabase/types";
import type { MeetingFollowUp } from "@/lib/workflow/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export type ReviewQueueItem = {
  id: string;
  title: string;
  started_at: string;
  ended_at: string | null;
  review_snoozed_until: string | null;
  openActionItemsCount: number;
  suggestedActionItemsCount: number;
  actionItems: ActionItem[];
  followUp: MeetingFollowUp | null;
  participantEmails: string[];
};

export type ReviewQueueCounts = {
  pending: number;
  snoozed: number;
  reviewedToday: number;
};

function startOfLocalDayIso(timezone: string, now: Date): string {
  const dateIso = localDateIsoInTimezone(timezone, now);
  return new Date(`${dateIso}T00:00:00`).toISOString();
}

export async function getReviewQueueCounts(
  supabase: Client,
  options: { now?: Date } = {}
): Promise<ReviewQueueCounts> {
  const now = options.now ?? new Date();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { pending: 0, snoozed: 0, reviewedToday: 0 };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .maybeSingle<{ timezone: string | null }>();

  const timezone = resolveTimezone(profile?.timezone);
  const dayStart = startOfLocalDayIso(timezone, now);

  const [pendingRes, snoozedRes, reviewedRes] = await Promise.all([
    supabase
      .from("meetings")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .is("meeting_reviewed_at", null)
      .or(`review_snoozed_until.is.null,review_snoozed_until.lte.${now.toISOString()}`),
    supabase
      .from("meetings")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .is("meeting_reviewed_at", null)
      .gt("review_snoozed_until", now.toISOString()),
    supabase
      .from("meetings")
      .select("id", { count: "exact", head: true })
      .gte("meeting_reviewed_at", dayStart),
  ]);

  return {
    pending: pendingRes.count ?? 0,
    snoozed: snoozedRes.count ?? 0,
    reviewedToday: reviewedRes.count ?? 0,
  };
}

export async function getReviewQueue(
  supabase: Client,
  options: { limit?: number; offset?: number; now?: Date } = {}
): Promise<{ items: ReviewQueueItem[]; counts: ReviewQueueCounts }> {
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;
  const now = options.now ?? new Date();

  const counts = await getReviewQueueCounts(supabase, { now });

  const { data: meetings, error } = await supabase
    .from("meetings")
    .select("id, title, started_at, ended_at, review_snoozed_until")
    .eq("status", "completed")
    .is("meeting_reviewed_at", null)
    .or(`review_snoozed_until.is.null,review_snoozed_until.lte.${now.toISOString()}`)
    .order("started_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const meetingRows = (meetings ?? []) as Pick<
    Meeting,
    "id" | "title" | "started_at" | "ended_at" | "review_snoozed_until"
  >[];

  if (meetingRows.length === 0) {
    return { items: [], counts };
  }

  const meetingIds = meetingRows.map((m) => m.id);

  const [actionItemsRes, followUpsRes, participantsRes] = await Promise.all([
    supabase
      .from("action_items")
      .select("*")
      .in("meeting_id", meetingIds)
      .order("created_at", { ascending: true }),
    supabase.from("meeting_follow_ups").select("*").in("meeting_id", meetingIds),
    supabase
      .from("participants")
      .select("meeting_id, email")
      .in("meeting_id", meetingIds)
      .not("email", "is", null),
  ]);

  if (actionItemsRes.error) throw actionItemsRes.error;
  if (followUpsRes.error) throw followUpsRes.error;
  if (participantsRes.error) throw participantsRes.error;

  const actionItemsByMeeting = new Map<string, ActionItem[]>();
  for (const item of (actionItemsRes.data ?? []) as ActionItem[]) {
    const list = actionItemsByMeeting.get(item.meeting_id) ?? [];
    list.push(item);
    actionItemsByMeeting.set(item.meeting_id, list);
  }

  const followUpByMeeting = new Map<string, MeetingFollowUp>();
  for (const row of (followUpsRes.data ?? []) as MeetingFollowUp[]) {
    followUpByMeeting.set(row.meeting_id, row);
  }

  const emailsByMeeting = new Map<string, string[]>();
  for (const row of (participantsRes.data ?? []) as { meeting_id: string; email: string | null }[]) {
    const email = row.email?.trim().toLowerCase();
    if (!email) continue;
    const list = emailsByMeeting.get(row.meeting_id) ?? [];
    if (!list.includes(email)) list.push(email);
    emailsByMeeting.set(row.meeting_id, list);
  }

  const items: ReviewQueueItem[] = meetingRows
    .filter((meeting) => !isReviewSnoozed(meeting.review_snoozed_until, now))
    .map((meeting) => {
      const actionItems = actionItemsByMeeting.get(meeting.id) ?? [];
      return {
        id: meeting.id,
        title: meeting.title,
        started_at: meeting.started_at,
        ended_at: meeting.ended_at,
        review_snoozed_until: meeting.review_snoozed_until,
        openActionItemsCount: actionItems.filter((i) => i.status === "open").length,
        suggestedActionItemsCount: actionItems.filter((i) => i.status === "suggested").length,
        actionItems,
        followUp: followUpByMeeting.get(meeting.id) ?? null,
        participantEmails: emailsByMeeting.get(meeting.id) ?? [],
      };
    });

  return { items, counts };
}
