"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { MeetingStatus } from "@/lib/supabase/types";

const LIVE_STATUSES = new Set<MeetingStatus>(["bot_joining", "recording", "processing"]);

export function useMeetingStatus(meetingId: string, initialStatus: MeetingStatus) {
  const router = useRouter();

  useEffect(() => {
    if (!LIVE_STATUSES.has(initialStatus)) return;

    const interval = window.setInterval(() => {
      router.refresh();
    }, 8000);

    return () => window.clearInterval(interval);
  }, [meetingId, initialStatus, router]);
}
