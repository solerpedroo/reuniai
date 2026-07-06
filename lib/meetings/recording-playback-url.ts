import "server-only";

import { RECORDINGS_BUCKET } from "@/lib/meetings/recording";
import type { ResolvedRecording } from "@/lib/meetings/resolve-recording";
import type { createAdminClient } from "@/lib/supabase/admin";
import { fetchRecordingMediaDownload } from "@/lib/vexa/client";

type AdminClient = ReturnType<typeof createAdminClient>;

export type PlaybackUrl = {
  url: string;
  /** `direct` = URL externa (Storage/Vexa); `proxy` = mesmo origin via stream */
  delivery: "direct" | "proxy";
  contentType: string;
};

/** URL reproduzível no `<audio>` — preferência por link direto quando disponível. */
export async function resolveRecordingPlaybackUrl(
  admin: AdminClient,
  meetingId: string,
  resolved: ResolvedRecording
): Promise<PlaybackUrl | null> {
  const fallbackType = resolved.contentType ?? "audio/wav";

  if (resolved.source === "supabase" && resolved.storagePath) {
    const { data: signed, error } = await admin.storage
      .from(RECORDINGS_BUCKET)
      .createSignedUrl(resolved.storagePath, 60 * 60);

    if (error || !signed?.signedUrl) return null;

    return {
      url: signed.signedUrl,
      delivery: "direct",
      contentType: fallbackType,
    };
  }

  if (resolved.source === "proxy" && resolved.vexaRef) {
    const { recordingId, mediaFileId } = resolved.vexaRef;
    const download = await fetchRecordingMediaDownload(recordingId, mediaFileId);

    if (download?.download_url?.startsWith("http")) {
      return {
        url: download.download_url,
        delivery: "direct",
        contentType: download.content_type ?? fallbackType,
      };
    }

    return {
      url: `/api/meetings/${meetingId}/recording/stream`,
      delivery: "proxy",
      contentType: download?.content_type ?? fallbackType,
    };
  }

  return null;
}
