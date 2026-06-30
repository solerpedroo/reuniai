import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/crypto/token-encrypt";
import { refreshOutlookAccessToken } from "@/lib/calendar/outlook";

type AdminClient = ReturnType<typeof createAdminClient>;

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

export async function getOutlookAccessTokenForUser(
  admin: AdminClient,
  userId: string
): Promise<string | null> {
  const { data: connection } = await admin
    .from("calendar_connections")
    .select("refresh_token_encrypted")
    .eq("user_id", userId)
    .eq("provider", "outlook")
    .maybeSingle();

  if (!connection?.refresh_token_encrypted) return null;
  const refreshToken = decryptToken(connection.refresh_token_encrypted);
  return refreshOutlookAccessToken(refreshToken);
}

async function graphFetch(accessToken: string, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${GRAPH_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });
}

export type TeamsTranscriptSegment = {
  speaker: string;
  text: string;
  startMs: number;
  endMs: number;
};

type GraphTranscript = {
  id: string;
  createdDateTime?: string;
};

/**
 * Lista transcripts de uma reunião Teams via Graph API.
 * Requer organizador com licença Teams Premium/Enterprise.
 */
export async function listTeamsTranscripts(
  accessToken: string,
  onlineMeetingId: string
): Promise<GraphTranscript[]> {
  const res = await graphFetch(
    accessToken,
    `/me/onlineMeetings/${encodeURIComponent(onlineMeetingId)}/transcripts`
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Graph transcripts: ${res.status} ${body}`);
  }
  const data = (await res.json()) as { value?: GraphTranscript[] };
  return data.value ?? [];
}

/**
 * Baixa conteúdo VTT do transcript Teams e converte para segmentos normalizados.
 */
export async function fetchTeamsTranscriptSegments(
  accessToken: string,
  onlineMeetingId: string,
  transcriptId: string
): Promise<TeamsTranscriptSegment[]> {
  const res = await graphFetch(
    accessToken,
    `/me/onlineMeetings/${encodeURIComponent(onlineMeetingId)}/transcripts/${encodeURIComponent(transcriptId)}/content`,
    { headers: { Accept: "text/vtt" } }
  );
  if (!res.ok) {
    throw new Error(`Graph transcript content: ${res.status} ${await res.text()}`);
  }
  const vtt = await res.text();
  return parseWebVtt(vtt);
}

/** Parser mínimo de WebVTT → segmentos com tempos em ms. */
export function parseWebVtt(vtt: string): TeamsTranscriptSegment[] {
  const segments: TeamsTranscriptSegment[] = [];
  const blocks = vtt.split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 2) continue;

    const timeLine = lines.find((l) => l.includes("-->"));
    if (!timeLine) continue;

    const [startRaw, endRaw] = timeLine.split("-->").map((s) => s.trim());
    const startMs = parseVttTimestamp(startRaw);
    const endMs = parseVttTimestamp(endRaw);
    if (startMs === null || endMs === null) continue;

    const textLines = lines.filter((l) => !l.includes("-->") && !/^\d+$/.test(l.trim()));
    const rawText = textLines.join(" ").trim();
    if (!rawText) continue;

    const speakerMatch = rawText.match(/^([^:]+):\s*(.+)$/);
    const speaker = speakerMatch?.[1]?.trim() || "Participante";
    const text = speakerMatch?.[2]?.trim() || rawText;

    segments.push({ speaker, text, startMs, endMs: Math.max(endMs, startMs + 1) });
  }

  return segments;
}

function parseVttTimestamp(value: string): number | null {
  const match = value.match(/(?:(\d+):)?(\d{2}):(\d{2})[.,](\d{3})/);
  if (!match) return null;
  const hours = match[1] ? Number.parseInt(match[1], 10) : 0;
  const minutes = Number.parseInt(match[2], 10);
  const seconds = Number.parseInt(match[3], 10);
  const ms = Number.parseInt(match[4], 10);
  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + ms;
}

export async function getOutlookAccessToken(
  admin: AdminClient,
  userId: string
): Promise<string | null> {
  return getOutlookAccessTokenForUser(admin, userId);
}
