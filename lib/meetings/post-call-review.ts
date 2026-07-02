import { isReviewSnoozed } from "@/lib/review/review-snooze";
import type { Meeting } from "@/lib/supabase/types";

export type MeetingReviewState = Pick<Meeting, "status"> & {
  meeting_reviewed_at?: string | null;
  review_snoozed_until?: string | null;
};

export function needsPostCallReview(
  meeting: MeetingReviewState,
  now = new Date()
): boolean {
  if (meeting.status !== "completed" || meeting.meeting_reviewed_at != null) {
    return false;
  }
  return !isReviewSnoozed(meeting.review_snoozed_until, now);
}

export function meetingReviewHref(meetingId: string): string {
  return `/reunioes/${meetingId}?revisar=1`;
}

export const REVIEW_QUEUE_HREF = "/revisar";
