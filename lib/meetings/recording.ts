import type { Meeting } from "@/lib/supabase/types";
import { recordingStoragePath } from "@/lib/supabase/types";

export const RECORDINGS_BUCKET = "recordings";

export function resolveRecordingPath(meeting: Pick<Meeting, "id" | "user_id" | "recording_path">) {
  return meeting.recording_path ?? recordingStoragePath(meeting.user_id, meeting.id);
}

export function meetingHasRecording(meeting: Pick<Meeting, "status" | "recording_path">) {
  return (
    Boolean(meeting.recording_path) ||
    meeting.status === "completed" ||
    meeting.status === "partial"
  );
}
