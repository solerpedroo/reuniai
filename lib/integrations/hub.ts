import "server-only";

import type { createClient } from "@/lib/supabase/server";
import type { IntegrationEvent } from "@/lib/integrations/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export type IntegrationProvider = "slack" | "notion" | "webhook";

export type IntegrationLogEntry = {
  id: string;
  provider: IntegrationProvider;
  event: string;
  status: string;
  createdAt: string;
  meetingId: string | null;
  meetingTitle: string | null;
  summary: string;
  webhookId: string | null;
};

export function maskIntegrationUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.host;
    const path =
      parsed.pathname.length > 24
        ? `${parsed.pathname.slice(0, 16)}…`
        : parsed.pathname;
    return `${parsed.protocol}//${host}${path}`;
  } catch {
    return "••••••••";
  }
}

function payloadMeeting(payload: Record<string, unknown>): {
  id: string | null;
  title: string | null;
} {
  const meeting = payload.meeting as { id?: string; title?: string } | undefined;
  return {
    id: meeting?.id ?? null,
    title: meeting?.title ?? null,
  };
}

export async function getIntegrationLogs(
  supabase: Client,
  options: { limit?: number; webhookId?: string } = {}
): Promise<IntegrationLogEntry[]> {
  const limit = options.limit ?? 50;

  let query = supabase
    .from("webhook_deliveries")
    .select(
      "id, webhook_id, event, payload, status, last_error, created_at, outbound_webhooks!inner(url, user_id)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options.webhookId) {
    query = query.eq("webhook_id", options.webhookId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => {
    const typed = row as {
      id: string;
      webhook_id: string;
      event: IntegrationEvent;
      payload: Record<string, unknown>;
      status: string;
      last_error: string | null;
      created_at: string;
      outbound_webhooks: { url: string };
    };
    const meeting = payloadMeeting(typed.payload);
    const summary =
      typed.status === "delivered"
        ? "Entrega confirmada"
        : typed.last_error ?? "Falha na entrega";

    return {
      id: typed.id,
      provider: "webhook" as const,
      event: typed.event,
      status: typed.status,
      createdAt: typed.created_at,
      meetingId: meeting.id,
      meetingTitle: meeting.title,
      summary,
      webhookId: typed.webhook_id,
    };
  });
}

export async function getWebhookDetail(
  supabase: Client,
  webhookId: string
): Promise<{
  id: string;
  url: string;
  maskedUrl: string;
  events: IntegrationEvent[];
  enabled: boolean;
  description: string | null;
} | null> {
  const { data, error } = await supabase
    .from("outbound_webhooks")
    .select("id, url, events, enabled, description")
    .eq("id", webhookId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as {
    id: string;
    url: string;
    events: IntegrationEvent[];
    enabled: boolean;
    description: string | null;
  };

  return {
    ...row,
    maskedUrl: maskIntegrationUrl(row.url),
  };
}
