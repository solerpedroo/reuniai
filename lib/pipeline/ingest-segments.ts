import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { applySpeakerMappingsToMeeting } from "@/lib/speakers/mappings";

type AdminClient = ReturnType<typeof createAdminClient>;
type SegmentInsert = Database["public"]["Tables"]["transcript_segments"]["Insert"];

export type NormalizedSegment = {
  speaker: string;
  text: string;
  startMs: number;
  endMs: number;
};

export type IngestResult = {
  segments: number;
  status: "completed" | "partial";
  transcriptSource: Database["public"]["Enums"]["transcript_source"];
};

export function toSegmentRows(meetingId: string, segments: NormalizedSegment[]): SegmentInsert[] {
  const rows: SegmentInsert[] = [];
  let sequence = 0;

  for (const segment of segments) {
    const text = segment.text.trim();
    if (!text) continue;

    const startMs = Math.max(0, Math.round(segment.startMs));
    const endMs = Math.max(startMs + 1, Math.round(segment.endMs));

    rows.push({
      meeting_id: meetingId,
      start_ms: startMs,
      end_ms: endMs,
      speaker_label: segment.speaker.trim() || "Desconhecido",
      text,
      sequence,
    });
    sequence += 1;
  }

  return rows;
}

const INSERT_BATCH_SIZE = 250;

async function insertSegmentRows(
  admin: AdminClient,
  rows: SegmentInsert[]
): Promise<void> {
  for (let i = 0; i < rows.length; i += INSERT_BATCH_SIZE) {
    const batch = rows.slice(i, i + INSERT_BATCH_SIZE);
    const { error } = await admin.from("transcript_segments").insert(batch);
    if (error) throw error;
  }
}

/**
 * Persiste segmentos normalizados na reunião (idempotente).
 */
export async function persistMeetingSegments(
  admin: AdminClient,
  meetingId: string,
  segments: NormalizedSegment[],
  transcriptSource: Database["public"]["Enums"]["transcript_source"]
): Promise<IngestResult> {
  await admin
    .from("meetings")
    .update({ status: "processing", meeting_reviewed_at: null })
    .eq("id", meetingId);

  const rows = toSegmentRows(meetingId, segments);

  await admin.from("transcript_segments").delete().eq("meeting_id", meetingId);

  if (rows.length > 0) {
    await insertSegmentRows(admin, rows);
  }

  if (rows.length > 0) {
    const { data: meeting } = await admin
      .from("meetings")
      .select("user_id")
      .eq("id", meetingId)
      .maybeSingle<{ user_id: string }>();

    if (meeting) {
      const mappingWork = applySpeakerMappingsToMeeting(admin, meetingId, meeting.user_id).catch(
        (err) => {
          console.error("Falha ao aplicar speaker mappings (não bloqueante):", err);
        }
      );
      // Reuniões longas: evita timeout na rota enquanto atualiza milhares de labels.
      if (rows.length <= 200) {
        await mappingWork;
      }
    }
  }

  const ingestOutcome: IngestResult["status"] = rows.length > 0 ? "completed" : "partial";
  await admin
    .from("meetings")
    .update({ status: "processing", transcript_source: transcriptSource })
    .eq("id", meetingId);

  return { segments: rows.length, status: ingestOutcome, transcriptSource };
}
