import "server-only";

import type { BotPlatform } from "@/lib/meetings/meeting-url";
import { getRunningBots, getMeetingParticipants, getTranscript, getVexaMeeting } from "@/lib/vexa/client";
import {
  countHumanParticipants,
  getLastHumanTranscriptActivityMs,
  isCapturingVexaStatus,
  isJoiningVexaStatus,
  reconcileVexaLifecycleStatus,
  resolveAutoLeaveAt,
} from "@/lib/vexa/meeting-state";
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
  const lastHumanActivityMs = getLastHumanTranscriptActivityMs(transcript.segments ?? []);

  if (connected) {
    try {
      const participants = await getMeetingParticipants(platform, nativeMeetingId);
      humanCount = countHumanParticipants(participants);
      autoLeaveAt = resolveAutoLeaveAt({
        vexaStatus: lifecycleStatus,
        meetingStartedAt: startedAt ?? null,
        humanCount,
        lastHumanActivityMs,
      });
    } catch {
      humanCount = null;
      autoLeaveAt = null;
    }
  }

  return {
    connected,
    vexaStatus: lifecycleStatus,
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
