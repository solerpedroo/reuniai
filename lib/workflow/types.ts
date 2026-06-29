export type ShareScope = "summary_only" | "full_transcript";

export type ShareToken = {
  id: string;
  meeting_id: string;
  user_id: string;
  token: string;
  scope: ShareScope;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
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
