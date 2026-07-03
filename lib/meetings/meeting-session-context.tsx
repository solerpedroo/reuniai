"use client";

import { createContext, useContext } from "react";
import {
  useMeetingSession,
  type MeetingSessionResponse,
} from "@/lib/meetings/use-meeting-session";
import type { MeetingStatus } from "@/lib/supabase/types";

const MeetingSessionContext = createContext<MeetingSessionResponse | null>(null);

export function MeetingSessionProvider({
  meetingId,
  status,
  recallBotId,
  children,
}: {
  meetingId: string;
  status: MeetingStatus;
  recallBotId: string | null;
  children: React.ReactNode;
}) {
  const session = useMeetingSession(meetingId, status, recallBotId);
  return (
    <MeetingSessionContext.Provider value={session}>{children}</MeetingSessionContext.Provider>
  );
}

export function useMeetingSessionContext(): MeetingSessionResponse | null {
  return useContext(MeetingSessionContext);
}
