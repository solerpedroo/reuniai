import type { createClient } from "@/lib/supabase/server";
import type { TranscriptSegment } from "@/lib/supabase/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export async function getTranscriptSegments(
  supabase: Client,
  meetingId: string
): Promise<TranscriptSegment[]> {
  const { data, error } = await supabase
    .from("transcript_segments")
    .select("*")
    .eq("meeting_id", meetingId)
    .order("sequence", { ascending: true });

  if (error) throw error;
  return (data ?? []) as TranscriptSegment[];
}

/** Formata milissegundos como `m:ss` ou `h:mm:ss`. */
export function formatTimestamp(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "0:00";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}
