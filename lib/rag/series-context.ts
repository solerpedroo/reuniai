import "server-only";

import type { createClient } from "@/lib/supabase/server";
import { parseTopics } from "@/lib/meetings/insights";
import { formatTimestamp } from "@/lib/meetings/transcript";
import type { Meeting, MeetingSummary } from "@/lib/supabase/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export async function buildSeriesContext(
  supabase: Client,
  meetings: Meeting[],
  maxMeetings = 5
): Promise<string> {
  const recent = meetings.slice(0, maxMeetings);
  const chunks: string[] = [];

  for (const meeting of recent) {
    const { data: summary } = await supabase
      .from("meeting_summaries")
      .select("executive_summary, topics, decisions")
      .eq("meeting_id", meeting.id)
      .maybeSingle<MeetingSummary>();

    chunks.push(`## ${meeting.title} (${meeting.started_at})`);

    if (summary?.executive_summary) {
      chunks.push(`Resumo: ${summary.executive_summary}`);
    }

    const topics = parseTopics(summary?.topics ?? []);
    if (topics.length > 0) {
      chunks.push(
        "Tópicos:",
        ...topics.map((t) => `- ${t.title}: ${t.summary}`)
      );
    }

    const { data: segments } = await supabase
      .from("transcript_segments")
      .select("start_ms, speaker_label, text")
      .eq("meeting_id", meeting.id)
      .order("sequence", { ascending: true })
      .limit(12);

    if (segments?.length) {
      chunks.push(
        "Trechos:",
        ...((segments ?? []) as { start_ms: number; speaker_label: string; text: string }[]).map(
          (s, i) =>
            `#${i + 1} [${formatTimestamp(s.start_ms)}] ${s.speaker_label}: ${s.text.slice(0, 200)}`
        )
      );
    }

    chunks.push("");
  }

  return chunks.join("\n");
}
