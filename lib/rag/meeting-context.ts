import "server-only";

import type { createClient } from "@/lib/supabase/server";
import type { TranscriptSegment } from "@/lib/supabase/types";
import {
  cosineSimilarity,
  embedQuery,
  isEmbeddingsConfigured,
  parseVector,
} from "@/lib/embeddings/generate";
import { getMeetingSummary } from "@/lib/meetings/insights";
import { getTranscriptSegments } from "@/lib/meetings/transcript";

type Client = Awaited<ReturnType<typeof createClient>>;

const TOP_K = 8;
const MAX_CONTEXT_CHARS = 60_000;

export type ContextSegment = Pick<TranscriptSegment, "id" | "start_ms" | "speaker_label" | "text">;

export type MeetingContext = {
  summary: string | null;
  segments: ContextSegment[];
  retrieval: "vector" | "full";
};

/** Limita os segmentos a um orçamento de caracteres (preserva a ordem). */
function truncateByChars(segments: ContextSegment[]): ContextSegment[] {
  const result: ContextSegment[] = [];
  let total = 0;
  for (const seg of segments) {
    total += seg.text.length;
    if (total > MAX_CONTEXT_CHARS) break;
    result.push(seg);
  }
  return result.length > 0 ? result : segments.slice(0, 1);
}

async function selectByVector(
  supabase: Client,
  meetingId: string,
  question: string,
  segments: ContextSegment[]
): Promise<ContextSegment[] | null> {
  try {
    const { data: rows } = await supabase
      .from("transcript_embeddings")
      .select("segment_id, embedding")
      .eq("meeting_id", meetingId)
      .returns<{ segment_id: string; embedding: string }[]>();

    if (!rows || rows.length === 0) return null;

    const queryVec = await embedQuery(question);
    const scores = new Map<string, number>();
    for (const row of rows) {
      scores.set(row.segment_id, cosineSimilarity(queryVec, parseVector(row.embedding)));
    }

    const topIds = new Set(
      [...scores.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, TOP_K)
        .map(([id]) => id)
    );

    const selected = segments.filter((s) => topIds.has(s.id));
    return selected.length > 0 ? selected : null;
  } catch (err) {
    console.error("Busca vetorial falhou, usando transcrição completa:", err);
    return null;
  }
}

/**
 * Monta o contexto para o chat: resumo executivo + trechos relevantes.
 * Usa busca vetorial quando há embeddings; caso contrário, a transcrição
 * completa (truncada por orçamento de caracteres).
 */
export async function buildMeetingContext(
  supabase: Client,
  meetingId: string,
  question: string
): Promise<MeetingContext> {
  const [summary, allSegments] = await Promise.all([
    getMeetingSummary(supabase, meetingId),
    getTranscriptSegments(supabase, meetingId),
  ]);

  const segments: ContextSegment[] = allSegments.map((s) => ({
    id: s.id,
    start_ms: s.start_ms,
    speaker_label: s.speaker_label,
    text: s.text,
  }));

  let selected = segments;
  let retrieval: MeetingContext["retrieval"] = "full";

  if (isEmbeddingsConfigured() && segments.length > TOP_K) {
    const vectorSelection = await selectByVector(supabase, meetingId, question, segments);
    if (vectorSelection) {
      selected = vectorSelection;
      retrieval = "vector";
    }
  }

  return {
    summary: summary?.executive_summary ?? null,
    segments: retrieval === "vector" ? selected : truncateByChars(selected),
    retrieval,
  };
}
