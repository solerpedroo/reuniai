import "server-only";

import type { BotPlatform } from "@/lib/meetings/meeting-url";
import { getRunningBots, getTranscript } from "@/lib/vexa/client";
import { pickPrimaryAudioMedia } from "@/lib/vexa/recordings";
import type { MeetingSessionStatus } from "@/lib/vexa/session-types";

export type { MeetingSessionStatus };

const CAPTURING_STATUSES = new Set(["active", "stopping"]);

/** Confirma se o bot está na call, transcrevendo e/ou gravando áudio. */
export async function getMeetingSessionStatus(
  platform: BotPlatform,
  nativeMeetingId: string
): Promise<MeetingSessionStatus> {
  const [runningBots, transcript] = await Promise.all([
    getRunningBots().catch(() => []),
    getTranscript(platform, nativeMeetingId).catch(
      (): Awaited<ReturnType<typeof getTranscript>> => ({ segments: [], recordings: [] })
    ),
  ]);

  const bot = runningBots.find((item) => item.native_meeting_id === nativeMeetingId) ?? null;
  const vexaStatus = bot?.status ?? transcript.status ?? null;
  const segmentCount = transcript.segments?.length ?? 0;
  const recordingMedia = pickPrimaryAudioMedia(transcript);

  const connected = Boolean(bot) || CAPTURING_STATUSES.has(vexaStatus ?? "");
  const capturing = CAPTURING_STATUSES.has(vexaStatus ?? "");
  const transcriptionActive = segmentCount > 0 || capturing;

  return {
    connected,
    vexaStatus,
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
