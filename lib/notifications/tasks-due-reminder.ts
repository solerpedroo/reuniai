import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/notifications/dispatch";
import {
  notificationDedupeKey,
  tasksDueNotificationHref,
} from "@/lib/notifications/hrefs";
import { getUserNotificationPrefs } from "@/lib/profile/notification-prefs";
import {
  isLocalHourInTimezone,
  isSameLocalCalendarDay,
  localDateIsoInTimezone,
  resolveTimezone,
} from "@/lib/timezone/local-date";

type AdminClient = ReturnType<typeof createAdminClient>;

const TASKS_DUE_MORNING_HOUR = 8;

async function countOpenActionItemsDueToday(
  admin: AdminClient,
  userId: string,
  timezone: string
): Promise<number> {
  const today = localDateIsoInTimezone(timezone);

  const nowIso = new Date().toISOString();

  const { count, error } = await admin
    .from("action_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "open")
    .not("due_date", "is", null)
    .lte("due_date", today)
    .or(`snoozed_until.is.null,snoozed_until.lte.${nowIso}`);

  if (error) throw error;
  return count ?? 0;
}

function shouldSendTasksDueReminder(
  lastSentAt: string | null,
  now: Date,
  timezone: string
): boolean {
  if (!isLocalHourInTimezone(timezone, TASKS_DUE_MORNING_HOUR, now)) {
    return false;
  }

  if (!lastSentAt) return true;
  return !isSameLocalCalendarDay(new Date(lastSentAt), now, timezone);
}

export async function runTasksDueReminderCron(
  admin: AdminClient
): Promise<{ notified: number; skipped: number }> {
  const now = new Date();

  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, timezone, last_tasks_due_reminder_at");

  if (error) throw error;

  let notified = 0;
  let skipped = 0;

  for (const row of profiles ?? []) {
    const profile = row as {
      id: string;
      timezone: string | null;
      last_tasks_due_reminder_at: string | null;
    };

    const timezone = resolveTimezone(profile.timezone);
    if (!shouldSendTasksDueReminder(profile.last_tasks_due_reminder_at, now, timezone)) {
      skipped += 1;
      continue;
    }

    const prefs = await getUserNotificationPrefs(admin, profile.id);
    if (!prefs.tasks_due) {
      skipped += 1;
      continue;
    }

    const dueCount = await countOpenActionItemsDueToday(admin, profile.id, timezone);
    if (dueCount <= 0) {
      skipped += 1;
      continue;
    }

    const today = localDateIsoInTimezone(timezone, now);
    const result = await notifyUser(admin, {
      userId: profile.id,
      kind: "tasks_due",
      title: "Tarefas para hoje",
      body:
        dueCount === 1
          ? "Você tem 1 action item vencendo hoje."
          : `Você tem ${dueCount} action items vencendo hoje.`,
      href: tasksDueNotificationHref(),
      dedupeKey: notificationDedupeKey("tasks_due", [profile.id, today]),
    });

    if (!result.created) {
      skipped += 1;
      continue;
    }

    await admin
      .from("profiles")
      .update({ last_tasks_due_reminder_at: now.toISOString() })
      .eq("id", profile.id);

    notified += 1;
  }

  return { notified, skipped };
}
