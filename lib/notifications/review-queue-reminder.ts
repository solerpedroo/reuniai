import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/notifications/dispatch";
import {
  notificationDedupeKey,
  reviewQueueNotificationHref,
} from "@/lib/notifications/hrefs";
import { getUserNotificationPrefs } from "@/lib/profile/notification-prefs";
import {
  isLocalHourInTimezone,
  isSameLocalCalendarDay,
  localDateIsoInTimezone,
  resolveTimezone,
} from "@/lib/timezone/local-date";

type AdminClient = ReturnType<typeof createAdminClient>;

export const REVIEW_QUEUE_REMINDER_THRESHOLD = 3;
const REVIEW_QUEUE_MORNING_HOUR = 8;

async function countPendingReviewMeetings(
  admin: AdminClient,
  userId: string,
  now: Date
): Promise<number> {
  const { count, error } = await admin
    .from("meetings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "completed")
    .is("meeting_reviewed_at", null)
    .or(`review_snoozed_until.is.null,review_snoozed_until.lte.${now.toISOString()}`);

  if (error) throw error;
  return count ?? 0;
}

function shouldSendReviewQueueReminder(
  lastSentAt: string | null,
  now: Date,
  timezone: string
): boolean {
  if (!isLocalHourInTimezone(timezone, REVIEW_QUEUE_MORNING_HOUR, now)) {
    return false;
  }

  if (!lastSentAt) return true;
  return !isSameLocalCalendarDay(new Date(lastSentAt), now, timezone);
}

export async function runReviewQueueReminderCron(
  admin: AdminClient
): Promise<{ notified: number; skipped: number }> {
  const now = new Date();

  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, timezone, last_review_queue_reminder_at");

  if (error) throw error;

  let notified = 0;
  let skipped = 0;

  for (const row of profiles ?? []) {
    const profile = row as {
      id: string;
      timezone: string | null;
      last_review_queue_reminder_at: string | null;
    };

    const timezone = resolveTimezone(profile.timezone);
    if (
      !shouldSendReviewQueueReminder(profile.last_review_queue_reminder_at, now, timezone)
    ) {
      skipped += 1;
      continue;
    }

    const prefs = await getUserNotificationPrefs(admin, profile.id);
    if (!prefs.review_queue) {
      skipped += 1;
      continue;
    }

    const pendingCount = await countPendingReviewMeetings(admin, profile.id, now);
    if (pendingCount < REVIEW_QUEUE_REMINDER_THRESHOLD) {
      skipped += 1;
      continue;
    }

    const today = localDateIsoInTimezone(timezone, now);
    const result = await notifyUser(admin, {
      userId: profile.id,
      kind: "review_queue",
      title: "Fila de revisão",
      body:
        pendingCount === 1
          ? "Você tem 1 reunião aguardando revisão."
          : `Você tem ${pendingCount} reuniões aguardando revisão.`,
      href: reviewQueueNotificationHref(),
      dedupeKey: notificationDedupeKey("review_queue", [profile.id, today]),
    });

    if (!result.created && result.pushSent <= 0) {
      skipped += 1;
      continue;
    }

    await admin
      .from("profiles")
      .update({ last_review_queue_reminder_at: now.toISOString() })
      .eq("id", profile.id);

    notified += 1;
  }

  return { notified, skipped };
}
