import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { BotPlatform } from "@/lib/meetings/meeting-url";
import { getTranscript, type VexaTranscriptSegment } from "@/lib/vexa/client";
import {
  persistMeetingSegments,
  type IngestResult,
} from "@/lib/pipeline/ingest-segments";

type AdminClient = ReturnType<typeof createAdminClient>;

export type { IngestResult };

function vexaToNormalized(segments: VexaTranscriptSegment[]) {
  return (segments ?? []).map((segment) => ({
    speaker: segment.speaker?.trim() || "Desconhecido",
    text: segment.text ?? "",
    startMs: Math.max(0, Math.round((segment.start ?? 0) * 1000)),
    endMs: Math.max(0, Math.round((segment.end ?? 0) * 1000)),
  }));
}

export type IngestInput = {
  meetingId: string;
  platform: BotPlatform;
  nativeMeetingId: string;
};

/** Busca transcrição no Vexa e persiste (sem fallback). */
export async function ingestMeetingTranscript(
  admin: AdminClient,
  input: IngestInput
): Promise<IngestResult> {
  const transcript = await getTranscript(input.platform, input.nativeMeetingId);
  return persistMeetingSegments(
    admin,
    input.meetingId,
    vexaToNormalized(transcript.segments ?? []),
    "vexa"
  );
}
