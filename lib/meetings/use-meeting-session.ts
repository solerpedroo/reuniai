"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { shouldPollBotSession } from "@/lib/meetings/bot-lifecycle";
import type { MeetingStatus } from "@/lib/supabase/types";
import type { MeetingSessionStatus } from "@/lib/vexa/session-types";

const POLL_MS = 5_000;

export type MeetingSessionResponse = {
  live: boolean;
  session?: MeetingSessionStatus | null;
  message?: string;
  synced?: boolean;
  phase?: "processing";
};

export function useMeetingSession(
  meetingId: string,
  status: MeetingStatus,
  recallBotId: string | null
): MeetingSessionResponse | null {
  const [session, setSession] = useState<MeetingSessionResponse | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!shouldPollBotSession(status, recallBotId)) {
      setSession(null);
      return;
    }

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/meetings/${meetingId}/session`, { cache: "no-store" });
        const data = (await res.json()) as MeetingSessionResponse;
        if (cancelled) return;
        setSession(data);
        if (data.synced || data.phase === "processing" || data.live === false) {
          router.refresh();
        }
      } catch {
        if (!cancelled) {
          setSession({ live: true, session: null, message: "Falha ao consultar o bot." });
        }
      }
    }

    void poll();
    const interval = window.setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [meetingId, recallBotId, router, status]);

  return session;
}
