import "server-only";

import type { createClient } from "@/lib/supabase/server";
import { parseDecisions, parseTopics } from "@/lib/meetings/insights";
import { formatTimestamp } from "@/lib/meetings/transcript";
import {
  formatDuration,
  formatMeetingDate,
  getMeetingDurationMs,
} from "@/lib/meetings/types";
import type { ActionItem, Meeting, MeetingSummary, TranscriptSegment } from "@/lib/supabase/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export async function buildMeetingMarkdown(
  supabase: Client,
  meeting: Meeting
): Promise<string> {
  const [summaryRes, actionItemsRes, segmentsRes] = await Promise.all([
    supabase
      .from("meeting_summaries")
      .select("*")
      .eq("meeting_id", meeting.id)
      .maybeSingle<MeetingSummary>(),
    supabase
      .from("action_items")
      .select("*")
      .eq("meeting_id", meeting.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("transcript_segments")
      .select("*")
      .eq("meeting_id", meeting.id)
      .order("sequence", { ascending: true }),
  ]);

  const summary = summaryRes.data;
  const actionItems = (actionItemsRes.data ?? []) as ActionItem[];
  const segments = (segmentsRes.data ?? []) as TranscriptSegment[];

  const lines: string[] = [
    `# ${meeting.title}`,
    "",
    `- **Data:** ${formatMeetingDate(meeting.started_at)}`,
    `- **Duração:** ${formatDuration(getMeetingDurationMs(meeting))}`,
    `- **Plataforma:** ${meeting.platform}`,
    "",
  ];

  if (summary?.executive_summary) {
    lines.push("## Resumo executivo", "", summary.executive_summary, "");
  }

  const topics = parseTopics(summary?.topics ?? []);
  if (topics.length > 0) {
    lines.push("## Tópicos", "");
    for (const topic of topics) {
      lines.push(`### ${topic.title}`, "", topic.summary, "");
    }
  }

  const decisions = parseDecisions(summary?.decisions ?? []);
  if (decisions.length > 0) {
    lines.push("## Decisões", "");
    for (const decision of decisions) {
      lines.push(`- ${decision}`);
    }
    lines.push("");
  }

  if (actionItems.length > 0) {
    lines.push("## Atribuições", "");
    for (const item of actionItems) {
      const status = item.status === "done" ? "x" : " ";
      const assignee = item.assignee ? ` — ${item.assignee}` : "";
      const due = item.due_date ? ` (prazo: ${item.due_date})` : "";
      lines.push(`- [${status}] ${item.title}${assignee}${due}`);
    }
    lines.push("");
  }

  if (segments.length > 0) {
    lines.push("## Transcrição", "");
    for (const segment of segments) {
      lines.push(
        `**[${formatTimestamp(segment.start_ms)}] ${segment.speaker_label}:** ${segment.text}`,
        ""
      );
    }
  }

  lines.push("---", "", "_Exportado do ReuniAI_");
  return lines.join("\n");
}
