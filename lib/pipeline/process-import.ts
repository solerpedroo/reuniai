import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { recordingStoragePath } from "@/lib/supabase/types";
import { analyzeMeetingById } from "@/lib/pipeline/analyze-meeting";
import { persistMeetingSegments } from "@/lib/pipeline/ingest-segments";
import { contentTypeFromFilename } from "@/lib/meetings/recording-content-type";
import { transcribeUploadedAudio } from "@/lib/pipeline/transcribe-upload";

type AdminClient = ReturnType<typeof createAdminClient>;

export type ProcessImportResult =
  | { ok: true; segments: number; meetingId: string }
  | { ok: false; error: string };

export async function processImportedRecording(
  admin: AdminClient,
  userId: string,
  meetingId: string,
  fileBuffer: Buffer,
  filename: string
): Promise<ProcessImportResult> {
  const { data: meeting } = await admin
    .from("meetings")
    .select("id, user_id, status, transcript_source")
    .eq("id", meetingId)
    .maybeSingle<{ id: string; user_id: string; status: string; transcript_source: string | null }>();

  if (!meeting || meeting.user_id !== userId) {
    return { ok: false, error: "Reunião não encontrada." };
  }

  if (meeting.transcript_source !== "upload") {
    return { ok: false, error: "Esta reunião não é uma importação manual." };
  }

  const storagePath = recordingStoragePath(userId, meetingId, filename);

  const { error: uploadError } = await admin.storage
    .from("recordings")
    .upload(storagePath, fileBuffer, {
      upsert: true,
      contentType: contentTypeFromFilename(filename),
    });

  if (uploadError) {
    return { ok: false, error: uploadError.message };
  }

  await admin
    .from("meetings")
    .update({ status: "processing", recording_path: storagePath, error_message: null })
    .eq("id", meetingId);

  try {
    const segments = await transcribeUploadedAudio(fileBuffer, filename);
    const ingest = await persistMeetingSegments(admin, meetingId, segments, "upload");

    await admin
      .from("meetings")
      .update({ recording_path: storagePath, duration_ms: segments.at(-1)?.endMs ?? null })
      .eq("id", meetingId);

    await analyzeMeetingById(admin, meetingId);

    return { ok: true, segments: ingest.segments, meetingId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao processar importação.";
    await admin
      .from("meetings")
      .update({ status: "failed", error_message: message })
      .eq("id", meetingId);
    return { ok: false, error: message };
  }
}
