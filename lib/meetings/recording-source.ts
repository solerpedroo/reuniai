import "server-only";

export const VEXA_RECORDING_PREFIX = "vexa:";

export type VexaRecordingRef = {
  recordingId: string;
  mediaFileId: string;
};

/** Persiste referência opaca ao áudio no Vexa (não expõe credenciais). */
export function formatVexaRecordingRef(ref: VexaRecordingRef): string {
  return `${VEXA_RECORDING_PREFIX}${ref.recordingId}/${ref.mediaFileId}`;
}

export function parseVexaRecordingRef(path: string | null | undefined): VexaRecordingRef | null {
  if (!path?.startsWith(VEXA_RECORDING_PREFIX)) return null;

  const rest = path.slice(VEXA_RECORDING_PREFIX.length);
  const slash = rest.indexOf("/");
  if (slash <= 0) return null;

  const recordingId = rest.slice(0, slash).trim();
  const mediaFileId = rest.slice(slash + 1).trim();
  if (!recordingId || !mediaFileId) return null;

  return { recordingId, mediaFileId };
}

export function isVexaRecordingPath(path: string | null | undefined): boolean {
  return Boolean(parseVexaRecordingRef(path));
}

export function isSupabaseRecordingPath(path: string | null | undefined): boolean {
  return Boolean(path && !isVexaRecordingPath(path));
}
