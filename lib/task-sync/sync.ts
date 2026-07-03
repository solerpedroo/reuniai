import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { ActionItemForSync, TaskSyncProvider } from "@/lib/task-sync/types";
import {
  createTodoistTask,
  updateTodoistTask,
  getTodoistTaskStatus,
} from "@/lib/task-sync/todoist";
import {
  createGoogleTask,
  updateGoogleTask,
  getGoogleTaskStatus,
} from "@/lib/task-sync/google-tasks";

type AdminClient = ReturnType<typeof createAdminClient>;

type ConnectionRow = {
  provider: TaskSyncProvider;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  config: Record<string, unknown> | null;
  enabled: boolean;
};

async function getConnections(admin: AdminClient, userId: string): Promise<ConnectionRow[]> {
  const { data } = await admin
    .from("task_sync_connections")
    .select("provider, access_token_encrypted, refresh_token_encrypted, config, enabled")
    .eq("user_id", userId)
    .eq("enabled", true);

  return (data ?? []) as ConnectionRow[];
}

async function getMeetingTitle(admin: AdminClient, meetingId: string): Promise<string | null> {
  const { data } = await admin
    .from("meetings")
    .select("title")
    .eq("id", meetingId)
    .maybeSingle<{ title: string }>();
  return data?.title ?? null;
}

export async function pushActionItemToProviders(
  admin: AdminClient,
  item: ActionItemForSync
): Promise<void> {
  if (item.status === "suggested" || item.status === "cancelled") return;

  const connections = await getConnections(admin, item.user_id);
  if (connections.length === 0) return;

  const meetingTitle = await getMeetingTitle(admin, item.meeting_id);
  const description = meetingTitle ? `ReuniAI · ${meetingTitle}` : "ReuniAI";

  for (const conn of connections) {
    try {
      const { data: existing } = await admin
        .from("task_sync_links")
        .select("id, external_id")
        .eq("action_item_id", item.id)
        .eq("provider", conn.provider)
        .maybeSingle<{ id: string; external_id: string }>();

      const completed = item.status === "done";

      if (existing) {
        if (conn.provider === "todoist" && conn.access_token_encrypted) {
          await updateTodoistTask(conn.access_token_encrypted, existing.external_id, {
            title: item.title,
            dueDate: item.due_date,
            completed,
          });
        } else if (conn.provider === "google_tasks") {
          await updateGoogleTask(
            admin,
            item.user_id,
            conn.access_token_encrypted,
            conn.refresh_token_encrypted,
            conn.config ?? {},
            existing.external_id,
            { title: item.title, dueDate: item.due_date, completed }
          );
        }

        await admin
          .from("task_sync_links")
          .update({ last_pushed_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        let externalId: string;

        if (conn.provider === "todoist" && conn.access_token_encrypted) {
          externalId = await createTodoistTask(conn.access_token_encrypted, {
            title: item.title,
            dueDate: item.due_date,
            description,
          });
        } else if (conn.provider === "google_tasks") {
          externalId = await createGoogleTask(
            admin,
            item.user_id,
            conn.access_token_encrypted,
            conn.refresh_token_encrypted,
            conn.config ?? {},
            { title: item.title, dueDate: item.due_date, notes: description }
          );
        } else {
          continue;
        }

        await admin.from("task_sync_links").insert({
          action_item_id: item.id,
          user_id: item.user_id,
          provider: conn.provider,
          external_id: externalId,
          last_pushed_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error(`Falha sync push (${conn.provider}) item ${item.id}:`, err);
    }
  }
}

export async function pullExternalStatuses(
  admin: AdminClient,
  userId: string
): Promise<{ updated: number }> {
  const connections = await getConnections(admin, userId);
  if (connections.length === 0) return { updated: 0 };

  const { data: links } = await admin
    .from("task_sync_links")
    .select("id, action_item_id, provider, external_id")
    .eq("user_id", userId);

  if (!links?.length) return { updated: 0 };

  let updated = 0;

  for (const link of links) {
    const conn = connections.find((c) => c.provider === link.provider);
    if (!conn) continue;

    try {
      let externalStatus: "open" | "done" | null = null;

      if (conn.provider === "todoist" && conn.access_token_encrypted) {
        externalStatus = await getTodoistTaskStatus(conn.access_token_encrypted, link.external_id);
      } else if (conn.provider === "google_tasks") {
        externalStatus = await getGoogleTaskStatus(
          admin,
          userId,
          conn.access_token_encrypted,
          conn.refresh_token_encrypted,
          conn.config ?? {},
          link.external_id
        );
      }

      if (!externalStatus) continue;

      const { data: item } = await admin
        .from("action_items")
        .select("id, status")
        .eq("id", link.action_item_id)
        .maybeSingle<{ id: string; status: string }>();

      if (!item || item.status === "suggested" || item.status === "cancelled") continue;

      const newStatus = externalStatus === "done" ? "done" : "open";
      if (item.status !== newStatus) {
        await admin
          .from("action_items")
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq("id", item.id);
        updated += 1;
      }

      await admin
        .from("task_sync_links")
        .update({ last_pulled_at: new Date().toISOString() })
        .eq("id", link.id);
    } catch (err) {
      console.error(`Falha sync pull (${link.provider}) link ${link.id}:`, err);
    }
  }

  await admin
    .from("task_sync_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("user_id", userId);

  return { updated };
}

export async function listTaskSyncStatus(admin: AdminClient, userId: string) {
  const { data } = await admin
    .from("task_sync_connections")
    .select("provider, external_account_label, enabled, last_synced_at")
    .eq("user_id", userId);

  return data ?? [];
}
