import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { Meeting } from "@/lib/supabase/types";
import type { BotPlatform } from "@/lib/meetings/meeting-url";
import { parseMeetingUrl } from "@/lib/meetings/meeting-url";
import {
  extractMeetCode,
  fetchMeetTranscriptSegments,
  findConferenceRecord,
  getGoogleAccessTokenForUser,
  listMeetTranscripts,
} from "@/lib/google/meet-artifacts";
import {
  fetchTeamsTranscriptSegments,
  getOutlookAccessToken,
  listTeamsTranscripts,
} from "@/lib/microsoft/teams-transcripts";
import { getTranscript } from "@/lib/vexa/client";
import { persistMeetingSegments, type IngestResult } from "@/lib/pipeline/ingest-segments";

type AdminClient = ReturnType<typeof createAdminClient>;

type MeetingRow = Pick<
  Meeting,
  | "id"
  | "user_id"
  | "platform"
  | "meeting_url"
  | "recall_bot_id"
  | "native_artifact_id"
  | "prefer_native_transcript"
>;

export type IngestAttempt = IngestResult & { meetingId: string; source: string };

export class TranscriptUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranscriptUnavailableError";
  }
}

async function ingestFromVexa(
  admin: AdminClient,
  meeting: MeetingRow
): Promise<IngestAttempt | null> {
  if (!meeting.meeting_url) return null;

  const parsed = parseMeetingUrl(meeting.meeting_url);
  const nativeMeetingId = meeting.recall_bot_id ?? parsed?.nativeMeetingId;
  if (!parsed || !nativeMeetingId) return null;

  const transcript = await getTranscript(parsed.platform, nativeMeetingId);
  const segments = (transcript.segments ?? []).map((s) => ({
    speaker: s.speaker?.trim() || "Desconhecido",
    text: s.text ?? "",
    startMs: Math.max(0, Math.round((s.start ?? 0) * 1000)),
    endMs: Math.max(0, Math.round((s.end ?? 0) * 1000)),
  }));

  const result = await persistMeetingSegments(admin, meeting.id, segments, "vexa");
  return { ...result, meetingId: meeting.id, source: "vexa" };
}

async function ingestFromTeamsNative(
  admin: AdminClient,
  meeting: MeetingRow
): Promise<IngestAttempt | null> {
  const onlineMeetingId = meeting.native_artifact_id;
  if (!onlineMeetingId) return null;

  const accessToken = await getOutlookAccessToken(admin, meeting.user_id);
  if (!accessToken) return null;

  const transcripts = await listTeamsTranscripts(accessToken, onlineMeetingId);
  if (transcripts.length === 0) return null;

  const latest = transcripts[transcripts.length - 1];
  const segments = await fetchTeamsTranscriptSegments(
    accessToken,
    onlineMeetingId,
    latest.id
  );

  const result = await persistMeetingSegments(admin, meeting.id, segments, "teams_native");
  return { ...result, meetingId: meeting.id, source: "teams_native" };
}

async function ingestFromMeetNative(
  admin: AdminClient,
  meeting: MeetingRow
): Promise<IngestAttempt | null> {
  if (!meeting.meeting_url) return null;

  const meetingCode = extractMeetCode(meeting.meeting_url);
  if (!meetingCode) return null;

  const accessToken = await getGoogleAccessTokenForUser(admin, meeting.user_id);
  if (!accessToken) return null;

  const conferenceName = meeting.native_artifact_id;
  const conference = conferenceName
    ? { name: conferenceName }
    : await findConferenceRecord(accessToken, meetingCode);

  if (!conference?.name) return null;

  if (!meeting.native_artifact_id) {
    await admin
      .from("meetings")
      .update({ native_artifact_id: conference.name })
      .eq("id", meeting.id);
  }

  const transcripts = await listMeetTranscripts(accessToken, conference.name);
  if (transcripts.length === 0) return null;

  const latest = transcripts[transcripts.length - 1];
  const segments = await fetchMeetTranscriptSegments(
    accessToken,
    conference.name,
    latest.name
  );

  const result = await persistMeetingSegments(admin, meeting.id, segments, "meet_native");
  return { ...result, meetingId: meeting.id, source: "meet_native" };
}

/**
 * Cadeia de fallback: Vexa → artifact nativo (Teams/Meet) → erro claro.
 */
export async function ingestMeetingWithFallback(
  admin: AdminClient,
  meetingId: string
): Promise<IngestAttempt> {
  const { data: meeting } = await admin
    .from("meetings")
    .select(
      "id, user_id, platform, meeting_url, recall_bot_id, native_artifact_id, prefer_native_transcript"
    )
    .eq("id", meetingId)
    .maybeSingle<MeetingRow>();

  if (!meeting) {
    throw new TranscriptUnavailableError("Reunião não encontrada.");
  }

  const errors: string[] = [];
  const preferNative = meeting.prefer_native_transcript;

  const nativeFirst =
    preferNative || meeting.platform === "teams"
      ? [ingestFromTeamsNative, ingestFromMeetNative, ingestFromVexa]
      : meeting.platform === "google_meet"
        ? [ingestFromMeetNative, ingestFromVexa]
        : [ingestFromVexa, ingestFromMeetNative, ingestFromTeamsNative];

  for (const attempt of nativeFirst) {
    try {
      const result = await attempt(admin, meeting);
      if (result && result.segments > 0) return result;
      if (result && result.segments === 0) {
        errors.push(`${result.source}: transcrição vazia`);
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  const platformHint =
    meeting.platform === "teams"
      ? "Conecte o Outlook Calendar e verifique licença Teams Premium para transcripts nativos."
      : meeting.platform === "google_meet"
        ? "Conecte o Google Calendar com escopo Meet ou use o bot Vexa."
        : "Verifique se o bot entrou na reunião ou se há gravação nativa disponível.";

  throw new TranscriptUnavailableError(
    `Não foi possível obter a transcrição. ${platformHint}${errors.length ? ` Detalhes: ${errors.join("; ")}` : ""}`
  );
}

/** Compat: ingestão Vexa por native ID (webhook). */
export async function ingestByNativeId(
  admin: AdminClient,
  platform: BotPlatform,
  nativeMeetingId: string
): Promise<(IngestResult & { meetingId: string }) | null> {
  const { data: meeting } = await admin
    .from("meetings")
    .select("id")
    .eq("recall_bot_id", nativeMeetingId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!meeting) return null;

  try {
    const result = await ingestMeetingWithFallback(admin, meeting.id);
    return result;
  } catch {
    const transcript = await getTranscript(platform, nativeMeetingId);
    const segments = (transcript.segments ?? []).map((s) => ({
      speaker: s.speaker?.trim() || "Desconhecido",
      text: s.text ?? "",
      startMs: Math.max(0, Math.round((s.start ?? 0) * 1000)),
      endMs: Math.max(0, Math.round((s.end ?? 0) * 1000)),
    }));
    const persisted = await persistMeetingSegments(admin, meeting.id, segments, "vexa");
    return { ...persisted, meetingId: meeting.id };
  }
}
