import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { Meeting } from "@/lib/supabase/types";
import { parseMeetingUrl } from "@/lib/meetings/meeting-url";
import {
  isSupabaseRecordingPath,
  parseVexaRecordingRef,
} from "@/lib/meetings/recording-source";
import { persistVexaRecordingRef } from "@/lib/pipeline/persist-recording-ref";
import { getTranscript } from "@/lib/vexa/client";
import { pickPrimaryAudioMedia, recordingContentType } from "@/lib/vexa/recordings";

type AdminClient = ReturnType<typeof createAdminClient>;

export type ResolvedRecording = {
  source: "proxy" | "supabase";
  storagePath?: string;
  vexaRef?: { recordingId: string; mediaFileId: string };
  contentType?: string;
  durationSeconds?: number;
};

type MeetingRecordingRow = Pick<
  Meeting,
  "id" | "user_id" | "recording_path" | "recall_bot_id" | "meeting_url"
>;

export async function resolveMeetingRecording(
  admin: AdminClient,
  meeting: MeetingRecordingRow
): Promise<ResolvedRecording | null> {
  const vexaFromPath = parseVexaRecordingRef(meeting.recording_path);
  if (vexaFromPath) {
    return { source: "proxy", vexaRef: vexaFromPath };
  }

  if (isSupabaseRecordingPath(meeting.recording_path)) {
    return {
      source: "supabase",
      storagePath: meeting.recording_path!,
    };
  }

  const parsed = meeting.meeting_url ? parseMeetingUrl(meeting.meeting_url) : null;
  const nativeMeetingId = meeting.recall_bot_id ?? parsed?.nativeMeetingId;
  if (!parsed || !nativeMeetingId) return null;

  try {
    const transcript = await getTranscript(parsed.platform, nativeMeetingId);
    const media = pickPrimaryAudioMedia(transcript);
    if (!media) return null;

    await persistVexaRecordingRef(admin, meeting.id, transcript);

    return {
      source: "proxy",
      vexaRef: media,
      contentType: recordingContentType(media),
      durationSeconds: media.durationSeconds,
    };
  } catch {
    return null;
  }
}
