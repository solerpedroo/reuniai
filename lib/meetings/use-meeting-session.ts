"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { MeetingStatus } from "@/lib/supabase/types";
import type { MeetingSessionStatus } from "@/lib/vexa/session-types";

const LIVE_STATUSES = new Set<MeetingStatus>(["bot_joining", "recording", "processing"]);

export type MeetingSessionResponse = {
  live: boolean;
  session?: MeetingSessionStatus | null;
  message?: string;
  synced?: boolean;
};

export function useMeetingSession(
  meetingId: string,
  status: MeetingStatus,
  recallBotId: string | null
): MeetingSessionResponse | null {
  const [session, setSession] = useState<MeetingSessionResponse | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!LIVE_STATUSES.has(status) || !recallBotId) {
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
        if (data.synced) {
          router.refresh();
        }
      } catch {
        if (!cancelled) {
          setSession({ live: true, session: null, message: "Falha ao consultar o bot." });
        }
      }
    }

    void poll();
    const interval = window.setInterval(() => void poll(), 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [meetingId, recallBotId, router, status]);

  return session;
}
