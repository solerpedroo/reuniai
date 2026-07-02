import "server-only";

import type { createClient } from "@/lib/supabase/server";
import { parseDecisions, parseTopics } from "@/lib/meetings/insights";
import { formatTimestamp } from "@/lib/meetings/transcript";
import {
  formatDuration,
  formatMeetingDate,
  getMeetingDurationMs,
} from "@/lib/meetings/types";
import { redactManyTexts } from "@/lib/privacy/redact";
import type { RedactionAudit } from "@/lib/privacy/redact";
import type { ActionItem, Meeting, MeetingSummary, TranscriptSegment } from "@/lib/supabase/types";
import type { MeetingExportData, MeetingHighlightExport } from "@/lib/meetings/export-data";

export type { MeetingExportData, MeetingHighlightExport } from "@/lib/meetings/export-data";

type Client = Awaited<ReturnType<typeof createClient>>;

export async function loadMeetingExportData(
  supabase: Client,
  meeting: Meeting,
  options: { redact?: boolean; useLlm?: boolean } = {}
): Promise<MeetingExportData> {
  const [summaryRes, actionItemsRes, segmentsRes, highlightsRes] = await Promise.all([
    supabase
      .from("meeting_summaries")
      .select("*")
      .eq("meeting_id", meeting.id)
      .maybeSingle<MeetingSummary>(),
    supabase
      .from("action_items")
      .select("*")
      .eq("meeting_id", meeting.id)
      .neq("status", "suggested")
      .order("created_at", { ascending: true }),
    supabase
      .from("transcript_segments")
      .select("*")
      .eq("meeting_id", meeting.id)
      .order("sequence", { ascending: true }),
    supabase
      .from("meeting_highlights")
      .select("label, start_ms")
      .eq("meeting_id", meeting.id)
      .order("start_ms", { ascending: true }),
  ]);

  const summary = summaryRes.data;
  const actionItems = (actionItemsRes.data ?? []) as ActionItem[];
  const segments = (segmentsRes.data ?? []) as TranscriptSegment[];
  const highlights = (highlightsRes.data ?? []) as MeetingHighlightExport[];

  if (!options.redact) {
    return { meeting, summary, actionItems, segments, highlights, redactionAudit: { count: 0, types: [] } };
  }

  const textsToRedact: string[] = [];
  if (summary?.executive_summary) textsToRedact.push(summary.executive_summary);

  const topics = parseTopics(summary?.topics ?? []);
  for (const topic of topics) {
    textsToRedact.push(topic.title, topic.summary);
  }

  const decisions = parseDecisions(summary?.decisions ?? []);
  textsToRedact.push(...decisions);

  for (const item of actionItems) {
    textsToRedact.push(item.title);
    if (item.assignee) textsToRedact.push(item.assignee);
  }

  for (const highlight of highlights) {
    textsToRedact.push(highlight.label);
  }

  for (const segment of segments) {
    textsToRedact.push(segment.text, segment.speaker_label);
  }

  const { texts, audit } = await redactManyTexts(textsToRedact, { useLlm: options.useLlm });

  let index = 0;
  const next = () => texts[index++] ?? "";

  let redactedSummary = summary;
  if (summary) {
    const redactedTopics = topics.map(() => ({
      title: next(),
      summary: next(),
    }));
    const redactedDecisions = decisions.map(() => next());

    redactedSummary = {
      ...summary,
      executive_summary: summary.executive_summary ? next() : summary.executive_summary,
      topics: redactedTopics,
      decisions: redactedDecisions,
    };
  }

  const redactedActionItems = actionItems.map((item) => ({
    ...item,
    title: next(),
    assignee: item.assignee ? next() : item.assignee,
  }));

  const redactedHighlights = highlights.map((item) => ({
    ...item,
    label: next(),
  }));

  const redactedSegments = segments.map((segment) => ({
    ...segment,
    text: next(),
    speaker_label: next(),
  }));

  return {
    meeting,
    summary: redactedSummary,
    actionItems: redactedActionItems,
    segments: redactedSegments,
    highlights: redactedHighlights,
    redactionAudit: audit,
  };
}

export function buildMeetingMarkdownFromData(data: MeetingExportData): string {
  const { meeting, summary, actionItems, segments, highlights } = data;
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

  if (highlights.length > 0) {
    lines.push("## Momentos marcados", "");
    for (const item of highlights) {
      lines.push(`- [${formatTimestamp(item.start_ms)}] ${item.label}`);
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

export function buildMeetingJsonFromData(data: MeetingExportData): string {
  const { meeting, summary, actionItems, segments, highlights } = data;
  const payload = {
    meeting: {
      id: meeting.id,
      title: meeting.title,
      started_at: meeting.started_at,
      ended_at: meeting.ended_at,
      platform: meeting.platform,
      duration_ms: getMeetingDurationMs(meeting),
    },
    summary: summary
      ? {
          executive_summary: summary.executive_summary,
          topics: parseTopics(summary.topics ?? []),
          decisions: parseDecisions(summary.decisions ?? []),
        }
      : null,
    action_items: actionItems.map((item) => ({
      title: item.title,
      assignee: item.assignee,
      due_date: item.due_date,
      status: item.status,
      source: item.source,
    })),
    highlights: highlights.map((item) => ({
      start_ms: item.start_ms,
      label: item.label,
    })),
    transcript: segments.map((segment) => ({
      start_ms: segment.start_ms,
      end_ms: segment.end_ms,
      speaker: segment.speaker_label,
      text: segment.text,
    })),
    redaction: data.redactionAudit,
    exported_at: new Date().toISOString(),
  };

  return JSON.stringify(payload, null, 2);
}

export { buildMeetingPdfFromData } from "@/lib/pdf/meeting-pdf";

export async function buildMeetingMarkdown(
  supabase: Client,
  meeting: Meeting,
  options: { redact?: boolean } = {}
): Promise<{ markdown: string; audit: RedactionAudit }> {
  const data = await loadMeetingExportData(supabase, meeting, options);
  return {
    markdown: buildMeetingMarkdownFromData(data),
    audit: data.redactionAudit,
  };
}
