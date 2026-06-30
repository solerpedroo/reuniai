import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { parseDecisions, parseTopics } from "@/lib/meetings/insights";
import { formatTimestamp } from "@/lib/meetings/transcript";
import {
  formatDuration,
  formatMeetingDate,
  getMeetingDurationMs,
} from "@/lib/meetings/types";
import { redactManyTexts } from "@/lib/privacy/redact";
import { logExportAudit } from "@/lib/privacy/export-audit";
import type {
  ActionItem,
  Meeting,
  MeetingSummary,
  TranscriptSegment,
} from "@/lib/supabase/types";
import type { ShareToken } from "@/lib/workflow/types";

type AdminClient = ReturnType<typeof createAdminClient>;

export type ShareParticipant = {
  name: string;
  email: string | null;
};

export type ResolvedShare = {
  token: ShareToken;
  meeting: Meeting;
  summary: MeetingSummary | null;
  actionItems: ActionItem[];
  segments: TranscriptSegment[];
  participants: ShareParticipant[];
};

export async function resolveShareToken(
  admin: AdminClient,
  token: string
): Promise<ResolvedShare | null> {
  const { data: shareToken, error } = await admin
    .from("share_tokens")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (error || !shareToken) return null;

  const row = shareToken as ShareToken;
  if (row.revoked_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;

  const { data: meeting } = await admin
    .from("meetings")
    .select("*")
    .eq("id", row.meeting_id)
    .maybeSingle<Meeting>();

  if (!meeting) return null;

  const [summaryRes, actionItemsRes, segmentsRes, participantsRes] = await Promise.all([
    admin
      .from("meeting_summaries")
      .select("*")
      .eq("meeting_id", meeting.id)
      .maybeSingle<MeetingSummary>(),
    admin
      .from("action_items")
      .select("*")
      .eq("meeting_id", meeting.id)
      .neq("status", "suggested")
      .order("created_at", { ascending: true }),
    row.scope === "full_transcript"
      ? admin
          .from("transcript_segments")
          .select("*")
          .eq("meeting_id", meeting.id)
          .order("sequence", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    admin
      .from("participants")
      .select("name, email")
      .eq("meeting_id", meeting.id)
      .order("created_at", { ascending: true }),
  ]);

  if (actionItemsRes.error) throw actionItemsRes.error;
  if (segmentsRes.error) throw segmentsRes.error;
  if (participantsRes.error) throw participantsRes.error;

  let summary = summaryRes.data ?? null;
  let actionItems = (actionItemsRes.data ?? []) as ActionItem[];
  let segments = (segmentsRes.data ?? []) as TranscriptSegment[];
  let participants = (participantsRes.data ?? []) as ShareParticipant[];

  if (row.redact_pii !== false) {
    const texts: string[] = [];
    if (summary?.executive_summary) texts.push(summary.executive_summary);

    const topics = parseTopics(summary?.topics ?? []);
    for (const topic of topics) texts.push(topic.title, topic.summary);

    const decisions = parseDecisions(summary?.decisions ?? []);
    texts.push(...decisions);

    for (const item of actionItems) {
      texts.push(item.title);
      if (item.assignee) texts.push(item.assignee);
    }
    for (const segment of segments) {
      texts.push(segment.text, segment.speaker_label);
    }
    for (const participant of participants) {
      texts.push(participant.name);
      if (participant.email) texts.push(participant.email);
    }

    const { texts: redacted, audit } = await redactManyTexts(texts, { useLlm: true });
    let index = 0;
    const next = () => redacted[index++] ?? "";

    if (summary) {
      const redactedTopics = topics.map(() => ({ title: next(), summary: next() }));
      const redactedDecisions = decisions.map(() => next());
      summary = {
        ...summary,
        executive_summary: summary.executive_summary ? next() : summary.executive_summary,
        topics: redactedTopics,
        decisions: redactedDecisions,
      };
    }

    actionItems = actionItems.map((item) => ({
      ...item,
      title: next(),
      assignee: item.assignee ? next() : item.assignee,
    }));

    segments = segments.map((segment) => ({
      ...segment,
      text: next(),
      speaker_label: next(),
    }));

    participants = participants.map((participant) => ({
      name: next(),
      email: participant.email ? next() : participant.email,
    }));

    await logExportAudit(admin, {
      userId: row.user_id,
      meetingId: meeting.id,
      format: "share_view",
      audit,
      shareTokenId: row.id,
    });
  }

  return { token: row, meeting, summary, actionItems, segments, participants };
}

export function buildShareSummaryText(
  meeting: Meeting,
  summary: MeetingSummary | null,
  actionItems: ActionItem[]
): string {
  const lines: string[] = [
    meeting.title,
    formatMeetingDate(meeting.started_at),
    formatDuration(getMeetingDurationMs(meeting)),
  ];

  if (summary?.executive_summary) {
    lines.push("", summary.executive_summary);
  }

  const topics = parseTopics(summary?.topics ?? []);
  if (topics.length > 0) {
    lines.push("", "Tópicos:");
    for (const topic of topics) {
      lines.push(`• ${topic.title}: ${topic.summary}`);
    }
  }

  const decisions = parseDecisions(summary?.decisions ?? []);
  if (decisions.length > 0) {
    lines.push("", "Decisões:");
    for (const decision of decisions) {
      lines.push(`• ${decision}`);
    }
  }

  if (actionItems.length > 0) {
    lines.push("", "Atribuições:");
    for (const item of actionItems) {
      const assignee = item.assignee ? ` (${item.assignee})` : "";
      lines.push(`• ${item.title}${assignee}`);
    }
  }

  return lines.join("\n");
}

export function buildShareTranscriptText(segments: TranscriptSegment[]): string {
  return segments
    .map(
      (segment) =>
        `[${formatTimestamp(segment.start_ms)}] ${segment.speaker_label}: ${segment.text}`
    )
    .join("\n");
}
