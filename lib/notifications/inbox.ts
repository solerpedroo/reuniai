import "server-only";

import type { createClient } from "@/lib/supabase/server";
import type { NotificationKind } from "@/lib/notifications/kinds";
import {
  deleteNotification,
  getRecentNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/queries";
import type { AppNotification } from "@/lib/workflow/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export type NotificationInboxTab = "all" | "meetings" | "tasks" | "prep" | "system";

export const NOTIFICATION_TAB_KINDS: Record<
  NotificationInboxTab,
  NotificationKind[] | null
> = {
  all: null,
  meetings: ["completed", "review_queue"],
  tasks: ["tasks_due"],
  prep: ["prep"],
  system: ["bot_failed"],
};

export type NotificationInboxResult = {
  notifications: AppNotification[];
  unreadCount: number;
  tabCounts: Record<NotificationInboxTab, number>;
};

function matchesTab(notification: AppNotification, tab: NotificationInboxTab): boolean {
  const kinds = NOTIFICATION_TAB_KINDS[tab];
  if (!kinds) return true;
  return notification.kind != null && kinds.includes(notification.kind);
}

export async function getNotificationInbox(
  supabase: Client,
  options: {
    tab?: NotificationInboxTab;
    unreadOnly?: boolean;
    limit?: number;
  } = {}
): Promise<NotificationInboxResult> {
  const tab = options.tab ?? "all";
  const limit = options.limit ?? 100;
  const all = await getRecentNotifications(supabase, { limit: 200 });

  const unreadCount = all.filter((n) => !n.read_at).length;

  const tabCounts: Record<NotificationInboxTab, number> = {
    all: all.length,
    meetings: all.filter((n) => matchesTab(n, "meetings")).length,
    tasks: all.filter((n) => matchesTab(n, "tasks")).length,
    prep: all.filter((n) => matchesTab(n, "prep")).length,
    system: all.filter((n) => matchesTab(n, "system")).length,
  };

  let notifications = all.filter((n) => matchesTab(n, tab));
  if (options.unreadOnly) {
    notifications = notifications.filter((n) => !n.read_at);
  }

  return {
    notifications: notifications.slice(0, limit),
    unreadCount,
    tabCounts,
  };
}

export async function batchMarkNotificationsRead(
  userId: string,
  ids: string[]
): Promise<void> {
  for (const id of ids) {
    await markNotificationRead(userId, id);
  }
}

export async function batchDeleteNotifications(userId: string, ids: string[]): Promise<void> {
  for (const id of ids) {
    await deleteNotification(userId, id);
  }
}

export { markAllNotificationsRead };
