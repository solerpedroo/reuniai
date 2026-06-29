import "server-only";

import type { createClient } from "@/lib/supabase/server";
import {
  cosineSimilarity,
  embedQuery,
  isEmbeddingsConfigured,
  parseVector,
} from "@/lib/embeddings/generate";
import { searchMeetings } from "@/lib/meetings/queries";
import type { GlobalSearchResponse, SearchResultHit } from "@/lib/search/types";

const TOP_K = 24;

type Client = Awaited<ReturnType<typeof createClient>>;

function truncateSnippet(text: string, max = 160): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

async function semanticSearch(
  supabase: Client,
  query: string
): Promise<SearchResultHit[] | null> {
  if (!isEmbeddingsConfigured()) return null;

  try {
    const queryVec = await embedQuery(query);

    const { data: rows, error } = await supabase
      .from("transcript_embeddings")
      .select(
        "segment_id, meeting_id, embedding, transcript_segments(start_ms, speaker_label, text), meetings(title, started_at)"
      )
      .limit(500);

    if (error || !rows?.length) return null;

    type Row = {
      segment_id: string;
      meeting_id: string;
      embedding: string;
      transcript_segments: { start_ms: number; speaker_label: string; text: string } | null;
      meetings: { title: string; started_at: string } | null;
    };

    const scored = (
      (rows as Row[])
        .map((row) => {
          const segment = row.transcript_segments;
          const meeting = row.meetings;
          if (!segment || !meeting) return null;

          return {
            meetingId: row.meeting_id,
            meetingTitle: meeting.title,
            startedAt: meeting.started_at,
            segmentId: row.segment_id,
            startMs: segment.start_ms,
            speaker: segment.speaker_label,
            snippet: truncateSnippet(segment.text),
            score: cosineSimilarity(queryVec, parseVector(row.embedding)),
            mode: "semantic" as const,
          };
        })
        .filter((item) => item !== null) as SearchResultHit[]
    )
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_K);

    return scored.length > 0 ? scored : null;
  } catch (err) {
    console.error("Busca semântica falhou:", err);
    return null;
  }
}

type TranscriptSegmentRow = {
  id: string;
  start_ms: number;
  speaker_label: string;
  text: string;
};

async function textSearch(supabase: Client, query: string): Promise<SearchResultHit[]> {
  const page = await searchMeetings(supabase, query, { limit: 12 });
  const hits: SearchResultHit[] = [];

  for (const meeting of page.meetings) {
    const { data: segments } = await supabase
      .from("transcript_segments")
      .select("id, start_ms, speaker_label, text")
      .eq("meeting_id", meeting.id)
      .ilike("text", `%${query}%`)
      .order("sequence", { ascending: true })
      .limit(2);

    const titleMatch = meeting.title.toLowerCase().includes(query.toLowerCase());
    const rows = (segments ?? []) as TranscriptSegmentRow[];

    if (rows.length) {
      for (const segment of rows) {
        hits.push({
          meetingId: meeting.id,
          meetingTitle: meeting.title,
          startedAt: meeting.started_at,
          segmentId: segment.id,
          startMs: segment.start_ms,
          speaker: segment.speaker_label,
          snippet: truncateSnippet(segment.text),
          score: titleMatch ? 0.9 : 0.7,
          mode: "text",
        });
      }
    } else if (titleMatch) {
      hits.push({
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        startedAt: meeting.started_at,
        segmentId: meeting.id,
        startMs: 0,
        speaker: "—",
        snippet: "Correspondência no título da reunião",
        score: 0.8,
        mode: "text",
      });
    }
  }

  return hits.slice(0, TOP_K);
}

export async function globalSearch(
  supabase: Client,
  query: string
): Promise<GlobalSearchResponse> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { query: "", mode: "text", hits: [] };
  }

  const semantic = await semanticSearch(supabase, trimmed);
  if (semantic) {
    return { query: trimmed, mode: "semantic", hits: semantic };
  }

  const text = await textSearch(supabase, trimmed);
  return { query: trimmed, mode: "text", hits: text };
}

export type { GlobalSearchResponse, SearchResultHit } from "@/lib/search/types";
