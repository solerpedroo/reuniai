import "server-only";

import type {
  CommentLibraryEntry,
  CommentsLibrarySummary,
} from "@/lib/meetings/comments-library-types";
import type { createClient } from "@/lib/supabase/server";
import type { MeetingComment } from "@/lib/workflow/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export type { CommentLibraryEntry, CommentsLibrarySummary } from "@/lib/meetings/comments-library-types";
export { formatCommentTimestamp } from "@/lib/meetings/comments-library-types";

export async function getCommentsLibrary(
  supabase: Client,
  options: { meetingId?: string; limit?: number } = {}
): Promise<CommentsLibrarySummary> {
  const limit = options.limit ?? 100;

  let query = supabase
    .from("meeting_comments")
    .select("*, meetings(title, started_at)", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options.meetingId) {
    query = query.eq("meeting_id", options.meetingId);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  type Row = MeetingComment & {
    meetings: { title: string; started_at: string } | { title: string; started_at: string }[] | null;
  };

  const entries = (data ?? []).map((row) => {
    const typed = row as Row;
    const meeting = Array.isArray(typed.meetings) ? typed.meetings[0] : typed.meetings;
    return {
      id: typed.id,
      meeting_id: typed.meeting_id,
      start_ms: typed.start_ms,
      end_ms: typed.end_ms,
      label: typed.label,
      created_at: typed.created_at,
      meeting_title: meeting?.title ?? "Reunião",
      meeting_started_at: meeting?.started_at ?? typed.created_at,
    } satisfies CommentLibraryEntry;
  });

  return { total: count ?? entries.length, entries };
}
