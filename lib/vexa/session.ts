import "server-only";

import type { BotPlatform } from "@/lib/meetings/meeting-url";
import { getRunningBots, getTranscript, getVexaMeeting } from "@/lib/vexa/client";
import { isCapturingVexaStatus, isJoiningVexaStatus } from "@/lib/vexa/meeting-state";
import { pickPrimaryAudioMedia } from "@/lib/vexa/recordings";
import type { MeetingSessionStatus } from "@/lib/vexa/session-types";

export type { MeetingSessionStatus };

/** Confirma se o bot está na call, transcrevendo e/ou gravando áudio. */
export async function getMeetingSessionStatus(
  platform: BotPlatform,
  nativeMeetingId: string
): Promise<MeetingSessionStatus> {
  const [runningBots, transcript, vexaMeeting] = await Promise.all([
    getRunningBots().catch(() => []),
    getTranscript(platform, nativeMeetingId).catch(
      (): Awaited<ReturnType<typeof getTranscript>> => ({ segments: [], recordings: [] })
    ),
    getVexaMeeting(platform, nativeMeetingId).catch(() => null),
  ]);

  const bot = runningBots.find((item) => item.native_meeting_id === nativeMeetingId) ?? null;
  const segmentCount = transcript.segments?.length ?? 0;
  const recordingMedia = pickPrimaryAudioMedia(transcript);

  // Ciclo de vida vem de /meetings — nunca do uptime do container ("Up 4 seconds").
  let lifecycleStatus = vexaMeeting?.status ?? transcript.status ?? null;
  if (!lifecycleStatus && segmentCount > 0) {
    lifecycleStatus = "active";
  }
  if (!lifecycleStatus && bot) {
    lifecycleStatus = "joining";
  }

  const connected =
    Boolean(bot) ||
    isCapturingVexaStatus(lifecycleStatus ?? "") ||
    isJoiningVexaStatus(lifecycleStatus ?? "");
  const capturing =
    isCapturingVexaStatus(lifecycleStatus ?? "") || segmentCount > 0;
  const transcriptionActive = segmentCount > 0 || capturing;

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
  };
}
