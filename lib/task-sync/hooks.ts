import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { pushActionItemToProviders } from "@/lib/task-sync/sync";
import type { ActionItemForSync } from "@/lib/task-sync/types";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function syncActionItemById(
  admin: AdminClient,
  actionItemId: string
): Promise<void> {
  const { data } = await admin
    .from("action_items")
    .select("id, user_id, meeting_id, title, assignee, due_date, status")
    .eq("id", actionItemId)
    .maybeSingle<ActionItemForSync>();

  if (!data) return;
  await pushActionItemToProviders(admin, data);
}

export async function syncMeetingActionItems(
  admin: AdminClient,
  meetingId: string
): Promise<void> {
  const { data: items } = await admin
    .from("action_items")
    .select("id, user_id, meeting_id, title, assignee, due_date, status")
    .eq("meeting_id", meetingId)
    .neq("status", "suggested")
    .neq("status", "cancelled");

  for (const item of (items ?? []) as ActionItemForSync[]) {
    try {
      await pushActionItemToProviders(admin, item);
    } catch (err) {
      console.error(`Falha sync item ${item.id}:`, err);
    }
  }
}
