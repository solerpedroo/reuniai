import "server-only";

import { decryptToken } from "@/lib/crypto/token-encrypt";
import { refreshAccessToken } from "@/lib/calendar/google";

const MEET_API_BASE = "https://meet.googleapis.com/v2";

export type MeetTranscriptSegment = {
  speaker: string;
  text: string;
  startMs: number;
  endMs: number;
};

type ConferenceRecord = {
  name: string;
  startTime?: string;
  endTime?: string;
};

type TranscriptRecord = {
  name: string;
  state?: string;
};

type TranscriptEntry = {
  participant?: string;
  text?: string;
  startTime?: string;
  endTime?: string;
};

async function meetFetch(accessToken: string, path: string): Promise<Response> {
  return fetch(`${MEET_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/** Extrai o meeting code de uma URL Meet (abc-defg-hij). */
export function extractMeetCode(url: string): string | null {
  const match = url.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
  return match ? match[1].toLowerCase() : null;
}

export async function getGoogleAccessTokenForUser(
  admin: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>,
  userId: string
): Promise<string | null> {
  const { data: connection } = await admin
    .from("calendar_connections")
    .select("refresh_token_encrypted")
    .eq("user_id", userId)
    .eq("provider", "google")
    .maybeSingle();

  if (!connection?.refresh_token_encrypted) return null;
  const refreshToken = decryptToken(connection.refresh_token_encrypted);
  return refreshAccessToken(refreshToken);
}

/**
 * Busca conference record pelo meeting code via Meet API v2.
 */
export async function findConferenceRecord(
  accessToken: string,
  meetingCode: string
): Promise<ConferenceRecord | null> {
  const filter = encodeURIComponent(`space.meeting_code = "${meetingCode}"`);
  const res = await meetFetch(accessToken, `/conferenceRecords?filter=${filter}&pageSize=1`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Meet conferenceRecords: ${res.status} ${body}`);
  }
  const data = (await res.json()) as { conferenceRecords?: ConferenceRecord[] };
  return data.conferenceRecords?.[0] ?? null;
}

export async function listMeetTranscripts(
  accessToken: string,
  conferenceRecordName: string
): Promise<TranscriptRecord[]> {
  const res = await meetFetch(
    accessToken,
    `/${conferenceRecordName}/transcripts?pageSize=10`
  );
  if (!res.ok) {
    throw new Error(`Meet transcripts: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { transcripts?: TranscriptRecord[] };
  return (data.transcripts ?? []).filter((t) => t.state === "FILE_GENERATED" || !t.state);
}

export async function fetchMeetTranscriptSegments(
  accessToken: string,
  conferenceRecordName: string,
  transcriptName: string
): Promise<MeetTranscriptSegment[]> {
  const segments: MeetTranscriptSegment[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await meetFetch(
      accessToken,
      `/${transcriptName}/entries?${params.toString()}`
    );
    if (!res.ok) {
      throw new Error(`Meet transcript entries: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as {
      transcriptEntries?: TranscriptEntry[];
      nextPageToken?: string;
    };

    for (const entry of data.transcriptEntries ?? []) {
      const text = entry.text?.trim();
      if (!text) continue;
      const startMs = parseMeetTimestamp(entry.startTime);
      const endMs = parseMeetTimestamp(entry.endTime) ?? startMs + 1;
      segments.push({
        speaker: entry.participant?.split("/").pop() ?? "Participante",
        text,
        startMs,
        endMs: Math.max(endMs, startMs + 1),
      });
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return segments;
}

function parseMeetTimestamp(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}
