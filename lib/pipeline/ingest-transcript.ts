import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import type { BotPlatform } from "@/lib/meetings/meeting-url";
import { getTranscript, type VexaTranscriptSegment } from "@/lib/vexa/client";

type AdminClient = ReturnType<typeof createAdminClient>;
type SegmentInsert = Database["public"]["Tables"]["transcript_segments"]["Insert"];

export type IngestResult = {
  segments: number;
  status: "completed" | "partial";
};

/**
 * Converte os segmentos da transcrição do Vexa (tempos em segundos) para o
 * formato da tabela `transcript_segments` (ms inteiros, sequência ordenada).
 */
function toSegmentRows(
  meetingId: string,
  segments: VexaTranscriptSegment[]
): SegmentInsert[] {
  const rows: SegmentInsert[] = [];
  let sequence = 0;

  for (const segment of segments) {
    const text = segment.text?.trim();
    if (!text) continue;

    const startMs = Math.max(0, Math.round((segment.start ?? 0) * 1000));
    const rawEndMs = Math.round((segment.end ?? 0) * 1000);
    const endMs = rawEndMs > startMs ? rawEndMs : startMs + 1;

    rows.push({
      meeting_id: meetingId,
      start_ms: startMs,
      end_ms: endMs,
      speaker_label: segment.speaker?.trim() || "Desconhecido",
      text,
      sequence,
    });
    sequence += 1;
  }

  return rows;
}

export type IngestInput = {
  meetingId: string;
  platform: BotPlatform;
  nativeMeetingId: string;
};

/**
 * Busca a transcrição no Vexa e persiste os segmentos da reunião.
 * Idempotente: remove os segmentos existentes antes de reinserir.
 */
export async function ingestMeetingTranscript(
  admin: AdminClient,
  input: IngestInput
): Promise<IngestResult> {
  await admin.from("meetings").update({ status: "processing" }).eq("id", input.meetingId);

  const transcript = await getTranscript(input.platform, input.nativeMeetingId);
  const rows = toSegmentRows(input.meetingId, transcript.segments ?? []);

  await admin.from("transcript_segments").delete().eq("meeting_id", input.meetingId);

  if (rows.length > 0) {
    const { error } = await admin.from("transcript_segments").insert(rows);
    if (error) throw error;
  }

  const status: IngestResult["status"] = rows.length > 0 ? "completed" : "partial";
  await admin.from("meetings").update({ status }).eq("id", input.meetingId);

  return { segments: rows.length, status };
}

/**
 * Localiza a reunião pelo identificador nativo (armazenado em `recall_bot_id`)
 * e dispara a ingestão da transcrição.
 */
export async function ingestByNativeId(
  admin: AdminClient,
  platform: BotPlatform,
  nativeMeetingId: string
): Promise<IngestResult | null> {
  const { data: meeting } = await admin
    .from("meetings")
    .select("id")
    .eq("recall_bot_id", nativeMeetingId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!meeting) return null;
  return ingestMeetingTranscript(admin, {
    meetingId: meeting.id,
    platform,
    nativeMeetingId,
  });
}
