"use client";

import { MeetingStatusBanner } from "@/components/meetings/meeting-status-banner";
import { useMeetingStatus } from "@/lib/meetings/use-meeting-status";
import type { Meeting } from "@/lib/supabase/types";

export function MeetingLiveStatus({ meeting }: { meeting: Meeting }) {
  useMeetingStatus(meeting.id, meeting.status);

  return (
    <div aria-live="polite" aria-atomic="true">
      <MeetingStatusBanner meeting={meeting} />
    </div>
  );
}
