import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { ActionItem, Meeting, MeetingSummary } from "@/lib/supabase/types";
import { parseDecisions } from "@/lib/meetings/insights";
import { postSlackMeetingDigest } from "@/lib/slack/post-digest";
import {
  deliverWebhook,
  type DeliverResult,
} from "@/lib/integrations/webhooks";
import type { IntegrationEvent } from "@/lib/integrations/types";

type AdminClient = ReturnType<typeof createAdminClient>;

async function getEnabledWebhooks(admin: AdminClient, userId: string, event: IntegrationEvent) {
  const { data } = await admin
    .from("outbound_webhooks")
    .select("id, url, secret, events")
    .eq("user_id", userId)
    .eq("enabled", true);

  return (data ?? []).filter((hook) => {
    const events = hook.events as string[] | null;
    return events?.includes(event);
  });
}

async function logDelivery(
  admin: AdminClient,
  webhookId: string,
  event: IntegrationEvent,
  payload: Record<string, unknown>,
  result: DeliverResult
): Promise<void> {
  await admin.from("webhook_deliveries").insert({
    webhook_id: webhookId,
    event,
    payload: payload as never,
    status: result.ok ? "delivered" : "failed",
    attempts: result.attempts,
    last_error: result.error ?? null,
    delivered_at: result.ok ? new Date().toISOString() : null,
  });
}

async function dispatchOutboundWebhooks(
  admin: AdminClient,
  userId: string,
  event: IntegrationEvent,
  payload: Record<string, unknown>
): Promise<void> {
  const hooks = await getEnabledWebhooks(admin, userId, event);
  for (const hook of hooks) {
    const result = await deliverWebhook(hook.url, hook.secret, event, payload);
    await logDelivery(admin, hook.id, event, payload, result);
  }
}

export async function dispatchMeetingCompleted(
  admin: AdminClient,
  meetingId: string
): Promise<void> {
  const { data: meeting } = await admin
    .from("meetings")
    .select("id, user_id, title, started_at, ended_at, platform, meeting_url")
    .eq("id", meetingId)
    .maybeSingle<Meeting>();

  if (!meeting) return;

  const [summaryRes, actionItemsRes] = await Promise.all([
    admin
      .from("meeting_summaries")
      .select("*")
      .eq("meeting_id", meetingId)
      .maybeSingle<MeetingSummary>(),
    admin
      .from("action_items")
      .select("id, title, assignee, due_date, status, source")
      .eq("meeting_id", meetingId)
      .neq("status", "suggested"),
  ]);

  const summary = summaryRes.data;
  const actionItems = (actionItemsRes.data ?? []) as ActionItem[];

  const payload = {
    meeting: {
      id: meeting.id,
      title: meeting.title,
      started_at: meeting.started_at,
      ended_at: meeting.ended_at,
      platform: meeting.platform,
      url: meeting.meeting_url,
    },
    summary: summary
      ? {
          executive_summary: summary.executive_summary,
          decisions: parseDecisions(summary.decisions ?? []),
        }
      : null,
    action_items: actionItems.map((item) => ({
      id: item.id,
      title: item.title,
      assignee: item.assignee,
      due_date: item.due_date,
      status: item.status,
      source: item.source,
    })),
  };

  try {
    await postSlackMeetingDigest(admin, meetingId);
  } catch (err) {
    console.error("Falha ao enviar digest Slack (não bloqueante):", err);
  }

  await dispatchOutboundWebhooks(admin, meeting.user_id, "meeting.completed", payload);
}

export async function dispatchActionItemCreated(
  admin: AdminClient,
  meetingId: string,
  item: Pick<ActionItem, "id" | "user_id" | "title" | "assignee" | "due_date" | "status" | "source">
): Promise<void> {
  const { data: meeting } = await admin
    .from("meetings")
    .select("id, title")
    .eq("id", meetingId)
    .maybeSingle();

  const payload = {
    action_item: {
      id: item.id,
      title: item.title,
      assignee: item.assignee,
      due_date: item.due_date,
      status: item.status,
      source: item.source,
    },
    meeting: meeting ? { id: meeting.id, title: meeting.title } : { id: meetingId },
  };

  await dispatchOutboundWebhooks(admin, item.user_id, "action_item.created", payload);
}
