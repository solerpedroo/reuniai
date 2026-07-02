import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { getUserNotificationPrefs } from "@/lib/profile/notification-prefs";
import { sendPushToUser } from "@/lib/notifications/send-push";
import {
  KIND_PREF_KEY,
  type NotificationKind,
} from "@/lib/notifications/kinds";

type AdminClient = ReturnType<typeof createAdminClient>;

export type NotifyUserInput = {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href?: string | null;
  dedupeKey: string;
};

export type NotifyUserResult = {
  created: boolean;
  pushSent: number;
};

function shouldCreateInApp(
  prefs: Awaited<ReturnType<typeof getUserNotificationPrefs>>,
  kind: NotificationKind
): boolean {
  const prefKey = KIND_PREF_KEY[kind];
  return Boolean(prefs[prefKey]);
}

export async function notifyUser(
  admin: AdminClient,
  input: NotifyUserInput
): Promise<NotifyUserResult> {
  const prefs = await getUserNotificationPrefs(admin, input.userId);

  if (!shouldCreateInApp(prefs, input.kind)) {
    return { created: false, pushSent: 0 };
  }

  const { data, error } = await admin
    .from("notifications")
    .insert({
      user_id: input.userId,
      title: input.title,
      body: input.body,
      href: input.href ?? null,
      kind: input.kind,
      dedupe_key: input.dedupeKey,
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    if (error.code === "23505") {
      return { created: false, pushSent: 0 };
    }
    throw error;
  }

  if (!data) {
    return { created: false, pushSent: 0 };
  }

  let pushSent = 0;
  try {
    const pushResult = await sendPushToUser(admin, {
      userId: input.userId,
      title: input.title,
      body: input.body,
      href: input.href,
      kind: input.kind,
    });
    pushSent = pushResult.sent;
  } catch (err) {
    console.error("Falha ao enviar push (não bloqueante):", err);
  }

  return { created: true, pushSent };
}
