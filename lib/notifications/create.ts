import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/notifications/dispatch";
import type { NotificationKind } from "@/lib/notifications/kinds";

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * @deprecated Prefira `notifyUser` com `dedupeKey` para idempotência.
 */
export async function createNotification(
  admin: AdminClient,
  input: {
    userId: string;
    title: string;
    body: string;
    href?: string | null;
    kind?: NotificationKind;
    dedupeKey?: string;
  }
): Promise<void> {
  await notifyUser(admin, {
    userId: input.userId,
    kind: input.kind ?? "completed",
    title: input.title,
    body: input.body,
    href: input.href,
    dedupeKey: input.dedupeKey ?? `${input.kind ?? "completed"}:${input.userId}:${Date.now()}`,
  });
}
