import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";
import type { AppNotification } from "@/lib/workflow/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export async function getUnreadNotifications(
  supabase: Client,
  limit = 10
): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as AppNotification[];
}

export async function getRecentNotifications(
  supabase: Client,
  options: { limit?: number; unreadOnly?: boolean } = {}
): Promise<AppNotification[]> {
  const { limit = 30, unreadOnly = false } = options;

  let query = supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.is("read_at", null);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []) as AppNotification[];
}

export async function markNotificationRead(
  userId: string,
  notificationId: string
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) throw error;
}

export async function deleteNotification(
  userId: string,
  notificationId: string
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("notifications")
    .delete()
    .eq("id", notificationId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function deleteReadNotifications(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("notifications")
    .delete()
    .eq("user_id", userId)
    .not("read_at", "is", null);

  if (error) throw error;
}

export async function deleteAllNotifications(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("notifications").delete().eq("user_id", userId);

  if (error) throw error;
}
