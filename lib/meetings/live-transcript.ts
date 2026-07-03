import "server-only";

import { parseMeetingUrl } from "@/lib/meetings/meeting-url";
import { getTranscript, type VexaTranscriptSegment } from "@/lib/vexa/client";

export type LiveTranscriptSegment = {
  speaker: string;
  text: string;
  start_ms: number | null;
  absolute_start_time: string | null;
};

export type LiveTranscriptPayload = {
  segments: LiveTranscriptSegment[];
  segment_count: number;
};

function segmentStartMs(segment: VexaTranscriptSegment, meetingStartedAt: string): number | null {
  if (segment.absolute_start_time) {
    const abs = new Date(segment.absolute_start_time).getTime();
    const start = new Date(meetingStartedAt).getTime();
    if (Number.isFinite(abs) && Number.isFinite(start) && abs >= start) {
      return abs - start;
    }
  }
  if (typeof segment.start === "number" && Number.isFinite(segment.start)) {
    return Math.round(segment.start * 1000);
  }
  return null;
}

export function mapVexaSegmentsToLive(
  segments: VexaTranscriptSegment[],
  meetingStartedAt: string
): LiveTranscriptSegment[] {
  return segments.map((segment) => ({
    speaker: segment.speaker?.trim() || "Participante",
    text: segment.text.trim(),
    start_ms: segmentStartMs(segment, meetingStartedAt),
    absolute_start_time: segment.absolute_start_time ?? null,
  }));
}

export async function fetchLiveTranscript(input: {
  meetingUrl: string | null;
  recallBotId: string | null;
  meetingStartedAt: string;
}): Promise<LiveTranscriptPayload> {
  const parsed = input.meetingUrl ? parseMeetingUrl(input.meetingUrl) : null;
  const nativeId = input.recallBotId ?? parsed?.nativeMeetingId;

  if (!parsed || !nativeId) {
    return { segments: [], segment_count: 0 };
  }

  const transcript = await getTranscript(parsed.platform, nativeId);
  const raw = transcript.segments ?? [];
  const segments = mapVexaSegmentsToLive(raw, input.meetingStartedAt).filter((s) => s.text.length > 0);

  return { segments, segment_count: segments.length };
}
