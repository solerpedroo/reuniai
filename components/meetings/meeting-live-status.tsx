"use client";

import { MeetingStatusBanner } from "@/components/meetings/meeting-status-banner";
import { useMeetingSession } from "@/lib/meetings/use-meeting-session";
import { useMeetingStatus } from "@/lib/meetings/use-meeting-status";
import type { Meeting } from "@/lib/supabase/types";

export function MeetingLiveStatus({ meeting }: { meeting: Meeting }) {
  useMeetingStatus(meeting.id, meeting.status);
  const session = useMeetingSession(meeting.id, meeting.status, meeting.recall_bot_id);

  return (
    <div aria-live="polite" aria-atomic="true">
      <MeetingStatusBanner meeting={meeting} session={session} />
    </div>
  );
}
