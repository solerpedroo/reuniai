import "server-only";

import type { BotPlatform } from "@/lib/meetings/meeting-url";
import { getRunningBots, getMeetingParticipants, getTranscript, getVexaMeeting } from "@/lib/vexa/client";
import {
  getLastHumanTranscriptActivityMs,
  isCapturingVexaStatus,
  isJoiningVexaStatus,
  reconcileVexaLifecycleStatus,
  resolveAutoLeaveAt,
  resolveAutoLeaveReferenceMs,
  resolveSessionHumanCount,
} from "@/lib/vexa/meeting-state";
import { logStructured } from "@/lib/logging/structured";
import { pickPrimaryAudioMedia } from "@/lib/vexa/recordings";
import type { MeetingSessionStatus } from "@/lib/vexa/session-types";

export type { MeetingSessionStatus };

/** Confirma se o bot está na call, transcrevendo e/ou gravando áudio. */
export async function getMeetingSessionStatus(
  platform: BotPlatform,
  nativeMeetingId: string,
  startedAt?: string | null
): Promise<MeetingSessionStatus> {
  const [runningBots, transcript, vexaMeeting] = await Promise.all([
    getRunningBots().catch(() => []),
    getTranscript(platform, nativeMeetingId).catch(
      (): Awaited<ReturnType<typeof getTranscript>> => ({ segments: [], recordings: [] })
    ),
    getVexaMeeting(platform, nativeMeetingId).catch(() => null),
  ]);

  const bot = runningBots.find((item) => item.native_meeting_id === nativeMeetingId) ?? null;
  const containerRunning = Boolean(bot);
  const segmentCount = transcript.segments?.length ?? 0;
  const recordingMedia = pickPrimaryAudioMedia(transcript);

  // Ciclo de vida vem de /meetings — nunca do uptime do container ("Up 4 seconds").
  let lifecycleStatus = vexaMeeting?.status ?? transcript.status ?? null;
  if (!lifecycleStatus && containerRunning && segmentCount > 0) {
    lifecycleStatus = "active";
  }
  if (!lifecycleStatus && containerRunning) {
    lifecycleStatus = "joining";
  }

  const elapsedMs = startedAt ? Date.now() - new Date(startedAt).getTime() : 0;

  lifecycleStatus = reconcileVexaLifecycleStatus(lifecycleStatus, containerRunning, elapsedMs);

  const connected =
    containerRunning &&
    (isCapturingVexaStatus(lifecycleStatus ?? "") ||
      isJoiningVexaStatus(lifecycleStatus ?? ""));
  const capturing =
    containerRunning && isCapturingVexaStatus(lifecycleStatus ?? "");
  const transcriptionActive =
    containerRunning &&
    (isCapturingVexaStatus(lifecycleStatus ?? "") || segmentCount > 0);

  let humanCount: number | null = null;
  let autoLeaveAt: string | null = null;
  const segments = transcript.segments ?? [];
  const lastHumanActivityMs = getLastHumanTranscriptActivityMs(segments);
  const referenceMs = resolveAutoLeaveReferenceMs(vexaMeeting?.start_time, startedAt);

  if (containerRunning) {
    let participantsResponse: Awaited<ReturnType<typeof getMeetingParticipants>> | null = null;

    try {
      participantsResponse = await getMeetingParticipants(platform, nativeMeetingId);
    } catch (err) {
      logStructured("warn", "session.participants_unavailable", {
        platform,
        nativeMeetingId,
        message: err instanceof Error ? err.message : String(err),
      });
    }

    humanCount = resolveSessionHumanCount(participantsResponse, segments, lastHumanActivityMs);

    autoLeaveAt = resolveAutoLeaveAt({
      vexaStatus: lifecycleStatus,
      referenceMs,
      humanCount,
      lastHumanActivityMs,
    });
  }

  return {
    connected,
    containerRunning,
    vexaStatus: lifecycleStatus,
    vexaStartTime: vexaMeeting?.start_time ?? null,
    transcription: {
      enabled: true,
      active: transcriptionActive,
      segmentCount,
    },
    recording: {
      enabled: true,
      capturing,
      available: Boolean(recordingMedia),
    },
    participants: {
      humanCount,
      autoLeaveAt,
    },
  };
}
