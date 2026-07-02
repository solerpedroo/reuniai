import "server-only";

import { FOLDER_NONE } from "@/lib/folders/constants";
import { getMeetingIdsByFolder, getMeetingIdsWithoutFolder } from "@/lib/folders/queries";
import type { createClient } from "@/lib/supabase/server";
import {
  cosineSimilarity,
  embedQuery,
  formatVector,
  isEmbeddingsConfigured,
  parseVector,
} from "@/lib/embeddings/generate";
import { searchMeetings } from "@/lib/meetings/queries";
import type {
  GlobalSearchOptions,
  SearchModeFilter,
} from "@/lib/search/search-filters-types";
import { searchPeriodStart } from "@/lib/search/search-filters-types";
import type { GlobalSearchResponse, SearchResultHit } from "@/lib/search/types";

const TOP_K = 24;

type Client = Awaited<ReturnType<typeof createClient>>;

function truncateSnippet(text: string, max = 160): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

type RpcRow = {
  segment_id: string;
  meeting_id: string;
  start_ms: number;
  speaker_label: string;
  segment_text: string;
  meeting_title: string;
  started_at: string;
  similarity: number;
};

async function resolveAllowedMeetingIds(
  supabase: Client,
  options: GlobalSearchOptions
): Promise<Set<string> | null> {
  let allowed: Set<string> | null = null;

  if (options.seriesId) {
    const { data, error } = await supabase
      .from("meetings")
      .select("id")
      .eq("calendar_recurring_event_id", options.seriesId);
    if (error) throw error;
    allowed = new Set((data ?? []).map((row) => (row as { id: string }).id));
  }

  if (options.folderId) {
    const folderIds =
      options.folderId === FOLDER_NONE
        ? await getMeetingIdsWithoutFolder(supabase)
        : await getMeetingIdsByFolder(supabase, options.folderId);
    allowed = allowed
      ? new Set([...allowed].filter((id) => folderIds.has(id)))
      : folderIds;
  }

  return allowed;
}

function filterHits(
  hits: SearchResultHit[],
  options: GlobalSearchOptions,
  allowedMeetingIds: Set<string> | null
): SearchResultHit[] {
  const periodStart = searchPeriodStart(options.period ?? "all");
  return hits.filter((hit) => {
    if (periodStart && new Date(hit.startedAt) < periodStart) return false;
    if (allowedMeetingIds && !allowedMeetingIds.has(hit.meetingId)) return false;
    return true;
  });
}

async function semanticSearchFallback(
  supabase: Client,
  query: string
): Promise<SearchResultHit[] | null> {
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
  } catch {
    return null;
  }
}

async function semanticSearchRpc(
  supabase: Client,
  query: string
): Promise<SearchResultHit[] | null> {
  if (!isEmbeddingsConfigured()) return null;

  try {
    const queryVec = await embedQuery(query);

    type RpcClient = {
      rpc: (
        fn: string,
        args: { query_embedding: string; match_count: number }
      ) => Promise<{ data: RpcRow[] | null; error: Error | null }>;
    };

    const { data: rows, error } = await (supabase as unknown as RpcClient).rpc(
      "match_transcript_embeddings",
      {
        query_embedding: formatVector(queryVec),
        match_count: TOP_K,
      }
    );

    if (error || !rows?.length) {
      return semanticSearchFallback(supabase, query);
    }

    return rows.map((row) => ({
      meetingId: row.meeting_id,
      meetingTitle: row.meeting_title,
      startedAt: row.started_at,
      segmentId: row.segment_id,
      startMs: row.start_ms,
      speaker: row.speaker_label,
      snippet: truncateSnippet(row.segment_text),
      score: row.similarity,
      mode: "semantic" as const,
    }));
  } catch (err) {
    console.error("Busca semântica RPC falhou:", err);
    return semanticSearchFallback(supabase, query);
  }
}

type TranscriptSegmentRow = {
  id: string;
  start_ms: number;
  speaker_label: string;
  text: string;
};

async function textSearch(
  supabase: Client,
  query: string,
  allowedMeetingIds: Set<string> | null
): Promise<SearchResultHit[]> {
  const page = await searchMeetings(supabase, query, { limit: 24 });
  const hits: SearchResultHit[] = [];

  for (const meeting of page.meetings) {
    if (allowedMeetingIds && !allowedMeetingIds.has(meeting.id)) continue;

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

function emptyResponse(embeddingsAvailable: boolean): GlobalSearchResponse {
  return { query: "", mode: "text", hits: [], embeddingsAvailable };
}

export async function globalSearch(
  supabase: Client,
  query: string,
  options: GlobalSearchOptions = {}
): Promise<GlobalSearchResponse> {
  const embeddingsAvailable = isEmbeddingsConfigured();
  const trimmed = query.trim();
  if (!trimmed) {
    return emptyResponse(embeddingsAvailable);
  }

  const allowedMeetingIds = await resolveAllowedMeetingIds(supabase, options);
  const mode: SearchModeFilter = options.mode ?? "auto";

  if (mode !== "text") {
    const semantic = await semanticSearchRpc(supabase, trimmed);
    if (semantic?.length) {
      const hits = filterHits(semantic, options, allowedMeetingIds);
      if (hits.length > 0 || mode === "semantic") {
        return { query: trimmed, mode: "semantic", hits, embeddingsAvailable };
      }
    }
    if (mode === "semantic") {
      return { query: trimmed, mode: "semantic", hits: [], embeddingsAvailable };
    }
  }

  const text = filterHits(
    await textSearch(supabase, trimmed, allowedMeetingIds),
    options,
    allowedMeetingIds
  );
  return { query: trimmed, mode: "text", hits: text, embeddingsAvailable };
}

export type { GlobalSearchResponse, SearchResultHit } from "@/lib/search/types";
