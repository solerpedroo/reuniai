import "server-only";

import PDFDocument from "pdfkit";
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

type Client = Awaited<ReturnType<typeof createClient>>;

export type MeetingHighlightExport = {
  label: string;
  start_ms: number;
};

export type MeetingExportData = {
  meeting: Meeting;
  summary: MeetingSummary | null;
  actionItems: ActionItem[];
  segments: TranscriptSegment[];
  highlights: MeetingHighlightExport[];
  redactionAudit: RedactionAudit;
};

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

export async function buildMeetingPdfFromData(data: MeetingExportData): Promise<Buffer> {
  const { meeting, summary, actionItems, segments, highlights } = data;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text(meeting.title, { align: "left" });
    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .fillColor("#666")
      .text(
        `${formatMeetingDate(meeting.started_at)} · ${formatDuration(getMeetingDurationMs(meeting))} · ${meeting.platform}`
      );
    doc.fillColor("#000");
    doc.moveDown();

    if (summary?.executive_summary) {
      doc.fontSize(14).text("Resumo executivo", { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(11).text(summary.executive_summary);
      doc.moveDown();
    }

    const topics = parseTopics(summary?.topics ?? []);
    if (topics.length > 0) {
      doc.fontSize(14).text("Tópicos", { underline: true });
      doc.moveDown(0.3);
      for (const topic of topics) {
        doc.fontSize(11).text(topic.title, { continued: false });
        doc.fontSize(10).fillColor("#444").text(topic.summary);
        doc.fillColor("#000");
        doc.moveDown(0.3);
      }
      doc.moveDown();
    }

    const decisions = parseDecisions(summary?.decisions ?? []);
    if (decisions.length > 0) {
      doc.fontSize(14).text("Decisões", { underline: true });
      doc.moveDown(0.3);
      for (const decision of decisions) {
        doc.fontSize(11).text(`• ${decision}`);
      }
      doc.moveDown();
    }

    if (actionItems.length > 0) {
      doc.fontSize(14).text("Atribuições", { underline: true });
      doc.moveDown(0.3);
      for (const item of actionItems) {
        const assignee = item.assignee ? ` (${item.assignee})` : "";
        const due = item.due_date ? ` — prazo ${item.due_date}` : "";
        doc.fontSize(11).text(`• ${item.title}${assignee}${due}`);
      }
      doc.moveDown();
    }

    if (highlights.length > 0) {
      doc.fontSize(14).text("Momentos marcados", { underline: true });
      doc.moveDown(0.3);
      for (const item of highlights) {
        doc.fontSize(11).text(`• [${formatTimestamp(item.start_ms)}] ${item.label}`);
      }
      doc.moveDown();
    }

    if (segments.length > 0) {
      doc.addPage();
      doc.fontSize(14).text("Transcrição", { underline: true });
      doc.moveDown(0.5);

      for (const segment of segments) {
        const line = `[${formatTimestamp(segment.start_ms)}] ${segment.speaker_label}: ${segment.text}`;
        doc.fontSize(9).text(line, { lineGap: 2 });
        if (doc.y > doc.page.height - 80) doc.addPage();
      }
    }

    doc.fontSize(8).fillColor("#999").text("Exportado do ReuniAI", 50, doc.page.height - 40, {
      align: "center",
      width: doc.page.width - 100,
    });

    doc.end();
  });
}

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
