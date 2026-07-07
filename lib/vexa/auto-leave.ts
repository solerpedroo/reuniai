import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { BotPlatform } from "@/lib/meetings/meeting-url";
import { logStructured } from "@/lib/logging/structured";
import { syncLiveRosterNames } from "@/lib/meetings/live-roster";
import { stopBot } from "@/lib/vexa/client";
import { finalizeStoppedMeeting } from "@/lib/vexa/finalize-meeting";
import { shouldAutoLeaveEmptyMeeting, resolveAutoLeaveReferenceMs } from "@/lib/vexa/meeting-state";
import { getMeetingParticipants, getTranscript } from "@/lib/vexa/client";

type AdminClient = ReturnType<typeof createAdminClient>;

export type AutoLeaveMeetingInput = {
  meetingId: string;
  platform: BotPlatform;
  nativeMeetingId: string;
  vexaStatus: string;
  meetingStartedAt: string;
  vexaStartTime?: string | null;
  containerUp: boolean;
  dbStatus: string;
};

export type AutoLeaveMeetingResult = {
  autoLeft: boolean;
  reason?: "empty_room";
};

/**
 * Encerra o bot quando a sala está vazia (sem humanos) e o Vexa ainda não saiu sozinho.
 * Usado pelo poll de cron e pela API de sessão (poll da UI a cada 5s).
 */
export async function tryAutoLeaveEmptyMeeting(
  admin: AdminClient,
  input: AutoLeaveMeetingInput
): Promise<AutoLeaveMeetingResult> {
  if (input.dbStatus !== "recording" && input.dbStatus !== "bot_joining") {
    return { autoLeft: false };
  }

  if (!input.containerUp || !input.vexaStatus) {
    return { autoLeft: false };
  }

  const referenceMs = resolveAutoLeaveReferenceMs(input.vexaStartTime, input.meetingStartedAt);

  let participantsResponse = null;
  let segments: Awaited<ReturnType<typeof getTranscript>>["segments"] = [];
  try {
    participantsResponse = await getMeetingParticipants(input.platform, input.nativeMeetingId);
    const transcript = await getTranscript(input.platform, input.nativeMeetingId);
    segments = transcript.segments ?? [];
  } catch {
    participantsResponse = null;
    segments = [];
  }

  const stickyRosterNames = await syncLiveRosterNames(
    admin,
    input.meetingId,
    participantsResponse,
    segments
  );

  const shouldLeave = await shouldAutoLeaveEmptyMeeting(
    input.platform,
    input.nativeMeetingId,
    input.vexaStatus,
    referenceMs,
    stickyRosterNames,
    { participants: participantsResponse, segments }
  );

  if (!shouldLeave) {
    return { autoLeft: false };
  }

  try {
    await stopBot(input.platform, input.nativeMeetingId);
    await finalizeStoppedMeeting(admin, input.platform, input.nativeMeetingId, {
      endTime: new Date().toISOString(),
      startTime: new Date(referenceMs).toISOString(),
    });
    logStructured("info", "bot.auto_leave.empty_room", {
      platform: input.platform,
      nativeMeetingId: input.nativeMeetingId,
      vexaStatus: input.vexaStatus,
    });
    return { autoLeft: true, reason: "empty_room" };
  } catch (err) {
    logStructured("error", "bot.auto_leave.failed", {
      platform: input.platform,
      nativeMeetingId: input.nativeMeetingId,
      message: err instanceof Error ? err.message : String(err),
    });
    return { autoLeft: false };
  }
}
