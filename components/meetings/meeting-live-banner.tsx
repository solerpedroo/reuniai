"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MeetingStatusBanner } from "@/components/meetings/meeting-status-banner";
import type { Meeting } from "@/lib/supabase/types";

const LIVE_STATUSES = new Set<Meeting["status"]>(["bot_joining", "recording", "processing"]);

export function MeetingLiveBanner({ meeting }: { meeting: Meeting }) {
  const router = useRouter();

  useEffect(() => {
    if (!LIVE_STATUSES.has(meeting.status)) return;

    const interval = window.setInterval(() => {
      router.refresh();
    }, 8000);

    return () => window.clearInterval(interval);
  }, [meeting.status, router]);

  return <MeetingStatusBanner meeting={meeting} />;
}
