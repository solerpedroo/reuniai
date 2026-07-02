import "server-only";

import type { createClient } from "@/lib/supabase/server";
import type { MeetingHighlight } from "@/lib/workflow/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export type HighlightLibraryEntry = MeetingHighlight & {
  meeting_title: string;
  meeting_started_at: string;
};

export type HighlightsLibrarySummary = {
  total: number;
  entries: HighlightLibraryEntry[];
};

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatHighlightTimestamp(startMs: number, endMs: number | null): string {
  if (endMs != null && endMs > startMs) {
    return `${formatMs(startMs)} – ${formatMs(endMs)}`;
  }
  return formatMs(startMs);
}

export async function getHighlightsLibrary(
  supabase: Client,
  options: { limit?: number } = {}
): Promise<HighlightsLibrarySummary> {
  const limit = options.limit ?? 100;

  const { data, error, count } = await supabase
    .from("meeting_highlights")
    .select("*, meetings(title, started_at)", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  type Row = MeetingHighlight & {
    meetings: { title: string; started_at: string } | { title: string; started_at: string }[] | null;
  };

  const entries = (data ?? []).map((row) => {
    const typed = row as Row;
    const meeting = Array.isArray(typed.meetings) ? typed.meetings[0] : typed.meetings;
    return {
      id: typed.id,
      meeting_id: typed.meeting_id,
      user_id: typed.user_id,
      start_ms: typed.start_ms,
      end_ms: typed.end_ms,
      label: typed.label,
      created_at: typed.created_at,
      updated_at: typed.updated_at,
      meeting_title: meeting?.title ?? "Reunião",
      meeting_started_at: meeting?.started_at ?? typed.created_at,
    } satisfies HighlightLibraryEntry;
  });

  return { total: count ?? entries.length, entries };
}
