import type { Meeting } from "@/lib/supabase/types";
import { recordingStoragePath } from "@/lib/supabase/types";
import { isSupabaseRecordingPath, isVexaRecordingPath } from "@/lib/meetings/recording-source";

export const RECORDINGS_BUCKET = "recordings";

export function resolveRecordingPath(meeting: Pick<Meeting, "id" | "user_id" | "recording_path">) {
  if (isSupabaseRecordingPath(meeting.recording_path)) {
    return meeting.recording_path!;
  }
  return recordingStoragePath(meeting.user_id, meeting.id);
}

export function meetingHasRecording(
  meeting: Pick<Meeting, "status" | "recording_path" | "recall_bot_id">
) {
  if (isVexaRecordingPath(meeting.recording_path)) return true;
  if (isSupabaseRecordingPath(meeting.recording_path)) return true;
  return false;
}
