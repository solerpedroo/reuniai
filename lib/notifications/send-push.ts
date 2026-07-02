import "server-only";

import webpush from "web-push";
import type { createAdminClient } from "@/lib/supabase/admin";
import { getUserNotificationPrefs } from "@/lib/profile/notification-prefs";
import type { NotificationPrefs } from "@/lib/workflow/types";
import {
  KIND_PREF_KEY,
  type NotificationKind,
} from "@/lib/notifications/kinds";

type AdminClient = ReturnType<typeof createAdminClient>;

export type PushNotificationKind = NotificationKind;

let vapidConfigured = false;

function ensureVapid(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;

  if (!vapidConfigured) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT ?? "mailto:support@reuniai.app",
      publicKey,
      privateKey
    );
    vapidConfigured = true;
  }
  return true;
}

function shouldSendPush(prefs: NotificationPrefs, kind: NotificationKind): boolean {
  if (!prefs.push) return false;
  const prefKey = KIND_PREF_KEY[kind];
  return Boolean(prefs[prefKey]);
}

export async function sendPushToUser(
  admin: AdminClient,
  input: {
    userId: string;
    title: string;
    body: string;
    href?: string | null;
    kind?: NotificationKind;
  }
): Promise<{ sent: number; failed: number }> {
  if (!ensureVapid()) return { sent: 0, failed: 0 };

  const kind = input.kind ?? "completed";
  const prefs = await getUserNotificationPrefs(admin, input.userId);
  if (!shouldSendPush(prefs, kind)) return { sent: 0, failed: 0 };

  const { data: subscriptions } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", input.userId);

  if (!subscriptions?.length) return { sent: 0, failed: 0 };

  const payload = JSON.stringify({
    title: input.title,
    body: input.body,
    href: input.href ?? "/",
    kind: input.kind,
  });

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      );
      sent += 1;
    } catch (err) {
      failed += 1;
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      }
      console.error("Falha ao enviar push:", err);
    }
  }

  return { sent, failed };
}
