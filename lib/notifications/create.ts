import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import {
  sendPushToUser,
  type PushNotificationKind,
} from "@/lib/notifications/send-push";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function createNotification(
  admin: AdminClient,
  input: {
    userId: string;
    title: string;
    body: string;
    href?: string | null;
    kind?: PushNotificationKind;
  }
): Promise<void> {
  const { error } = await admin.from("notifications").insert({
    user_id: input.userId,
    title: input.title,
    body: input.body,
    href: input.href ?? null,
  });

  if (error) throw error;

  try {
    await sendPushToUser(admin, {
      userId: input.userId,
      title: input.title,
      body: input.body,
      href: input.href,
      kind: input.kind,
    });
  } catch (err) {
    console.error("Falha ao enviar push (não bloqueante):", err);
  }
}
