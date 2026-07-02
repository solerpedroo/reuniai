import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationPrefs } from "@/lib/workflow/types";

type AdminClient = ReturnType<typeof createAdminClient>;

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  email: true,
  push: false,
  prep: true,
  completed: true,
  digest: true,
  bot_failed: true,
  tasks_due: true,
};

export async function getUserNotificationPrefs(
  admin: AdminClient,
  userId: string
): Promise<NotificationPrefs> {
  const { data: profile } = await admin
    .from("profiles")
    .select("notification_prefs")
    .eq("id", userId)
    .maybeSingle();

  const stored = (profile as { notification_prefs?: Partial<NotificationPrefs> } | null)
    ?.notification_prefs;

  return { ...DEFAULT_NOTIFICATION_PREFS, ...stored };
}
