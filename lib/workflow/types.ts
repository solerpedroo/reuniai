export type ShareScope = "summary_only" | "full_transcript";

export type ShareToken = {
  id: string;
  meeting_id: string;
  user_id: string;
  token: string;
  scope: ShareScope;
  expires_at: string;
  revoked_at: string | null;
  redact_pii: boolean;
  created_at: string;
};

export type MeetingComment = {
  id: string;
  meeting_id: string;
  user_id: string;
  start_ms: number;
  end_ms: number | null;
  label: string;
  created_at: string;
  updated_at: string;
};

export type Tag = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
};

export type MeetingFollowUp = {
  id: string;
  meeting_id: string;
  user_id: string;
  subject: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type MeetingPrepCard = {
  id: string;
  meeting_id: string;
  user_id: string;
  briefing: string;
  related_meeting_id: string | null;
  expires_at: string;
  created_at: string;
};

export type NotificationPrefs = {
  email: boolean;
  push: boolean;
  prep: boolean;
  completed: boolean;
  digest: boolean;
};

export type AppNotification = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

export type MeetingSeries = {
  recurringEventId: string;
  title: string;
  meetingCount: number;
  lastStartedAt: string;
  firstStartedAt: string;
};

export type SpeakerMapping = {
  id: string;
  user_id: string;
  label_pattern: string;
  participant_email: string | null;
  display_name: string;
  created_at: string;
  updated_at: string;
};

export type MeetingHighlight = {
  id: string;
  meeting_id: string;
  user_id: string;
  start_ms: number;
  end_ms: number | null;
  label: string;
  created_at: string;
  updated_at: string;
};

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
