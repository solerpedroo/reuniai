import type { Meeting } from "@/lib/supabase/types";

export type MeetingReviewState = Pick<Meeting, "status"> & {
  meeting_reviewed_at?: string | null;
};

export function needsPostCallReview(meeting: MeetingReviewState): boolean {
  return meeting.status === "completed" && meeting.meeting_reviewed_at == null;
}

export function meetingReviewHref(meetingId: string): string {
  return `/reunioes/${meetingId}?revisar=1`;
}
