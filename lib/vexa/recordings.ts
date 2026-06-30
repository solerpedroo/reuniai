import "server-only";

import type { VexaTranscriptResponse } from "@/lib/vexa/client";

export type VexaRecordingRef = {
  recordingId: string;
  mediaFileId: string;
  format?: string;
  durationSeconds?: number;
};

type VexaMediaFile = {
  id?: string | number;
  type?: string;
  format?: string;
  duration_seconds?: number;
};

type VexaRecording = {
  id?: string | number;
  status?: string;
  media_files?: VexaMediaFile[];
};

function toId(value: string | number | undefined): string | null {
  if (value === undefined || value === null) return null;
  const id = String(value).trim();
  return id.length > 0 ? id : null;
}

function contentTypeForFormat(format?: string): string {
  switch ((format ?? "").toLowerCase()) {
    case "mp3":
      return "audio/mpeg";
    case "mp4":
    case "m4a":
      return "audio/mp4";
    case "ogg":
      return "audio/ogg";
    case "webm":
      return "audio/webm";
    case "wav":
    default:
      return "audio/wav";
  }
}

/** Escolhe o melhor arquivo de áudio disponível na resposta do Vexa. */
export function pickPrimaryAudioMedia(
  transcript: VexaTranscriptResponse
): VexaRecordingRef | null {
  const recordings = (transcript.recordings ?? []) as VexaRecording[];

  for (const recording of recordings) {
    const recordingId = toId(recording.id);
    if (!recordingId) continue;

    const mediaFiles = recording.media_files ?? [];
    const audioFiles = mediaFiles.filter((file) => (file.type ?? "audio") === "audio");
    const candidates = audioFiles.length > 0 ? audioFiles : mediaFiles;

    for (const file of candidates) {
      const mediaFileId = toId(file.id);
      if (!mediaFileId) continue;

      return {
        recordingId,
        mediaFileId,
        format: file.format,
        durationSeconds: file.duration_seconds,
      };
    }
  }

  return null;
}

export function recordingContentType(ref: Pick<VexaRecordingRef, "format">): string {
  return contentTypeForFormat(ref.format);
}
