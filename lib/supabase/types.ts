import type { Database } from "@/lib/supabase/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type CalendarConnection = Database["public"]["Tables"]["calendar_connections"]["Row"];
export type Meeting = Database["public"]["Tables"]["meetings"]["Row"];
export type ActionItem = Database["public"]["Tables"]["action_items"]["Row"];
export type MeetingSummary = Database["public"]["Tables"]["meeting_summaries"]["Row"];
export type TranscriptSegment = Database["public"]["Tables"]["transcript_segments"]["Row"];
export type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"];

export type {
  Tag,
  ShareToken,
  MeetingFollowUp,
  MeetingPrepCard,
  AppNotification,
  NotificationPrefs,
  MeetingSeries,
  MeetingComment,
  SpeakerMapping,
  MeetingHighlight,
} from "@/lib/workflow/types";

export type MeetingPlatform = Database["public"]["Enums"]["meeting_platform"];
export type MeetingStatus = Database["public"]["Enums"]["meeting_status"];
export type ActionItemStatus = Database["public"]["Enums"]["action_item_status"];
export type ActionItemSource = Database["public"]["Enums"]["action_item_source"];

/** Storage path: `{user_id}/{meeting_id}/recording.mp4` */
export function recordingStoragePath(userId: string, meetingId: string, filename = "recording.mp4") {
  return `${userId}/${meetingId}/${filename}`;
}
