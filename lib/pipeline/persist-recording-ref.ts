import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { formatVexaRecordingRef } from "@/lib/meetings/recording-source";
import type { VexaTranscriptResponse } from "@/lib/vexa/client";
import { pickPrimaryAudioMedia } from "@/lib/vexa/recordings";

type AdminClient = ReturnType<typeof createAdminClient>;

/** Grava referência Vexa em recording_path quando a gravação estiver disponível. */
export async function persistVexaRecordingRef(
  admin: AdminClient,
  meetingId: string,
  transcript: VexaTranscriptResponse
): Promise<boolean> {
  const media = pickPrimaryAudioMedia(transcript);
  if (!media) return false;

  const { error } = await admin
    .from("meetings")
    .update({ recording_path: formatVexaRecordingRef(media) })
    .eq("id", meetingId);

  if (error) throw error;
  return true;
}
