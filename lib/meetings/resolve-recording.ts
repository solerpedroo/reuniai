import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { Meeting } from "@/lib/supabase/types";
import { contentTypeFromFilename } from "@/lib/meetings/recording-content-type";
import { parseMeetingUrl } from "@/lib/meetings/meeting-url";
import {
  isSupabaseRecordingPath,
  parseVexaRecordingRef,
} from "@/lib/meetings/recording-source";
import { persistVexaRecordingRef } from "@/lib/pipeline/persist-recording-ref";
import {
  fetchRecordingMediaDownload,
  getTranscript,
  isVexaRecordingMediaAvailable,
} from "@/lib/vexa/client";
import {
  pickPrimaryAudioMedia,
  recordingContentType,
  type VexaRecordingRef,
} from "@/lib/vexa/recordings";

type AdminClient = ReturnType<typeof createAdminClient>;

export type ResolvedRecording = {
  source: "proxy" | "supabase";
  storagePath?: string;
  vexaRef?: VexaRecordingRef;
  contentType?: string;
  durationSeconds?: number;
};

type MeetingRecordingRow = Pick<
  Meeting,
  "id" | "user_id" | "recording_path" | "recall_bot_id" | "meeting_url"
>;

type ResolveOptions = {
  /** Ignora `recording_path` em cache e busca de novo no Vexa. */
  forceRefresh?: boolean;
};

async function resolveFromVexaTranscript(
  admin: AdminClient,
  meeting: MeetingRecordingRow
): Promise<ResolvedRecording | null> {
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

async function resolveCachedVexaRef(
  vexaRef: VexaRecordingRef
): Promise<ResolvedRecording | null> {
  const available = await isVexaRecordingMediaAvailable(
    vexaRef.recordingId,
    vexaRef.mediaFileId
  );
  if (!available) return null;

  const download = await fetchRecordingMediaDownload(
    vexaRef.recordingId,
    vexaRef.mediaFileId
  );

  return {
    source: "proxy",
    vexaRef,
    contentType: download?.content_type ?? recordingContentType(vexaRef),
    durationSeconds: vexaRef.durationSeconds,
  };
}

export async function resolveMeetingRecording(
  admin: AdminClient,
  meeting: MeetingRecordingRow,
  options?: ResolveOptions
): Promise<ResolvedRecording | null> {
  if (isSupabaseRecordingPath(meeting.recording_path)) {
    return {
      source: "supabase",
      storagePath: meeting.recording_path!,
      contentType: contentTypeFromFilename(meeting.recording_path!),
    };
  }

  if (!options?.forceRefresh) {
    const vexaFromPath = parseVexaRecordingRef(meeting.recording_path);
    if (vexaFromPath) {
      const cached = await resolveCachedVexaRef(vexaFromPath);
      if (cached) return cached;
    }
  }

  return resolveFromVexaTranscript(admin, meeting);
}
