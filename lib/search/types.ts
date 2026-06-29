import { formatTimestamp } from "@/lib/meetings/transcript";

export type SearchResultHit = {
  meetingId: string;
  meetingTitle: string;
  startedAt: string;
  segmentId: string;
  startMs: number;
  speaker: string;
  snippet: string;
  score: number;
  mode: "semantic" | "text";
};

export type GlobalSearchResponse = {
  query: string;
  mode: "semantic" | "text";
  hits: SearchResultHit[];
};

export function formatSearchHitMeta(hit: SearchResultHit): string {
  const date = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(hit.startedAt));

  if (hit.startMs > 0) {
    return `${date} · ${formatTimestamp(hit.startMs)} · ${hit.speaker}`;
  }

  return date;
}
