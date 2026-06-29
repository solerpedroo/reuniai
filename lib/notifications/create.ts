import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function createNotification(
  admin: AdminClient,
  input: {
    userId: string;
    title: string;
    body: string;
    href?: string | null;
  }
): Promise<void> {
  const { error } = await admin.from("notifications").insert({
    user_id: input.userId,
    title: input.title,
    body: input.body,
    href: input.href ?? null,
  });

  if (error) throw error;
}
