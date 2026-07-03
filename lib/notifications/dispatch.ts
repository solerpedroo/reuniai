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

function wantsInAppNotification(
  prefs: Awaited<ReturnType<typeof getUserNotificationPrefs>>,
  kind: NotificationKind
): boolean {
  const prefKey = KIND_PREF_KEY[kind];
  return Boolean(prefs[prefKey]);
}

function wantsPushNotification(
  prefs: Awaited<ReturnType<typeof getUserNotificationPrefs>>,
  kind: NotificationKind
): boolean {
  if (!prefs.push) return false;
  const prefKey = KIND_PREF_KEY[kind];
  return Boolean(prefs[prefKey]);
}

async function hasDedupeNotification(
  admin: AdminClient,
  userId: string,
  dedupeKey: string
): Promise<boolean> {
  const { data } = await admin
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("dedupe_key", dedupeKey)
    .maybeSingle<{ id: string }>();

  return Boolean(data);
}

export async function notifyUser(
  admin: AdminClient,
  input: NotifyUserInput
): Promise<NotifyUserResult> {
  const prefs = await getUserNotificationPrefs(admin, input.userId);
  const createInApp = wantsInAppNotification(prefs, input.kind);
  const sendPush = wantsPushNotification(prefs, input.kind);

  if (!createInApp && !sendPush) {
    return { created: false, pushSent: 0 };
  }

  if (await hasDedupeNotification(admin, input.userId, input.dedupeKey)) {
    return { created: false, pushSent: 0 };
  }

  let created = false;

  if (createInApp) {
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

    created = Boolean(data);
  } else {
    const { error } = await admin.from("notifications").insert({
      user_id: input.userId,
      title: input.title,
      body: input.body,
      href: input.href ?? null,
      kind: input.kind,
      dedupe_key: input.dedupeKey,
      read_at: new Date().toISOString(),
    });

    if (error) {
      if (error.code === "23505") {
        return { created: false, pushSent: 0 };
      }
      throw error;
    }
  }

  let pushSent = 0;
  if (sendPush) {
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
  }

  return { created, pushSent };
}
