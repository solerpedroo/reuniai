export type IntegrationEvent = "meeting.completed" | "action_item.created";

export type SlackConnection = {
  id: string;
  user_id: string;
  team_id: string;
  team_name: string | null;
  channel_id: string | null;
  channel_name: string | null;
  bot_token_encrypted: string;
  created_at: string;
  updated_at: string;
};

export type NotionConnection = {
  id: string;
  user_id: string;
  workspace_id: string;
  workspace_name: string | null;
  access_token_encrypted: string;
  created_at: string;
  updated_at: string;
};

export type OutboundWebhook = {
  id: string;
  user_id: string;
  url: string;
  secret: string;
  events: IntegrationEvent[];
  description: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type WebhookDelivery = {
  id: string;
  webhook_id: string;
  event: IntegrationEvent;
  payload: Record<string, unknown>;
  status: "pending" | "delivered" | "failed";
  attempts: number;
  last_error: string | null;
  delivered_at: string | null;
  created_at: string;
};

export const INTEGRATION_EVENTS: IntegrationEvent[] = [
  "meeting.completed",
  "action_item.created",
];
