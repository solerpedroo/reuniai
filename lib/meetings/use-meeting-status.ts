"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { UI_REFRESH_STATUSES } from "@/lib/meetings/bot-lifecycle";
import type { MeetingStatus } from "@/lib/supabase/types";

const REFRESH_MS = 5_000;

export function useMeetingStatus(meetingId: string, initialStatus: MeetingStatus) {
  const router = useRouter();

  useEffect(() => {
    if (!UI_REFRESH_STATUSES.has(initialStatus)) return;

    const interval = window.setInterval(() => {
      router.refresh();
    }, REFRESH_MS);

    return () => window.clearInterval(interval);
  }, [meetingId, initialStatus, router]);
}
