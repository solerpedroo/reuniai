export type CommentLibraryEntry = {
  id: string;
  meeting_id: string;
  start_ms: number;
  end_ms: number | null;
  label: string;
  created_at: string;
  meeting_title: string;
  meeting_started_at: string;
};

export type CommentsLibrarySummary = {
  total: number;
  entries: CommentLibraryEntry[];
};

export function formatCommentTimestamp(startMs: number, endMs: number | null): string {
  const formatMs = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    return `${minutes}:${pad(seconds)}`;
  };

  if (endMs != null && endMs > startMs) {
    return `${formatMs(startMs)} – ${formatMs(endMs)}`;
  }
  return formatMs(startMs);
}
