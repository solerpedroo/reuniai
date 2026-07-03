import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type AdminClient = ReturnType<typeof createAdminClient>;
type UserTaskInsert = Database["public"]["Tables"]["user_tasks"]["Insert"];

export type ActionItemForHub = {
  id: string;
  user_id: string;
  meeting_id: string;
  title: string;
  assignee: string | null;
  due_date: string | null;
  status: string;
  source: string;
  priority?: string;
  snoozed_until?: string | null;
};

export async function pushActionItemToHub(
  admin: AdminClient,
  item: ActionItemForHub
): Promise<void> {
  if (item.status === "cancelled") {
    await admin.from("user_tasks").delete().eq("action_item_id", item.id);
    return;
  }

  const row: UserTaskInsert = {
    user_id: item.user_id,
    action_item_id: item.id,
    meeting_id: item.meeting_id,
    title: item.title,
    assignee: item.assignee,
    due_date: item.due_date,
    status: item.status as UserTaskInsert["status"],
    source: item.source as UserTaskInsert["source"],
    priority: (item.priority ?? "medium") as UserTaskInsert["priority"],
    snoozed_until: item.snoozed_until ?? null,
    hub_synced_at: new Date().toISOString(),
  };

  const { error } = await admin.from("user_tasks").upsert(row, {
    onConflict: "action_item_id",
  });

  if (error) throw error;
}

export async function pullHubTaskToActionItem(
  admin: AdminClient,
  userTaskId: string
): Promise<void> {
  const { data: task } = await admin
    .from("user_tasks")
    .select("*")
    .eq("id", userTaskId)
    .maybeSingle();

  if (!task?.action_item_id) return;

  await admin
    .from("action_items")
    .update({
      title: task.title,
      assignee: task.assignee,
      due_date: task.due_date,
      status: task.status,
      priority: task.priority,
      snoozed_until: task.snoozed_until,
      updated_at: new Date().toISOString(),
    })
    .eq("id", task.action_item_id);

  await admin
    .from("user_tasks")
    .update({ hub_synced_at: new Date().toISOString() })
    .eq("id", userTaskId);
}

export async function syncActionItemById(
  admin: AdminClient,
  actionItemId: string
): Promise<void> {
  const { data } = await admin
    .from("action_items")
    .select(
      "id, user_id, meeting_id, title, assignee, due_date, status, source, priority, snoozed_until"
    )
    .eq("id", actionItemId)
    .maybeSingle<ActionItemForHub>();

  if (!data) return;
  await pushActionItemToHub(admin, data);
}

export async function syncMeetingActionItems(
  admin: AdminClient,
  meetingId: string
): Promise<void> {
  const { data: items } = await admin
    .from("action_items")
    .select(
      "id, user_id, meeting_id, title, assignee, due_date, status, source, priority, snoozed_until"
    )
    .eq("meeting_id", meetingId)
    .neq("status", "cancelled");

  for (const item of (items ?? []) as ActionItemForHub[]) {
    try {
      await pushActionItemToHub(admin, item);
    } catch (err) {
      console.error(`Falha hub sync item ${item.id}:`, err);
    }
  }
}
