import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { parseDecisions, parseTopics } from "@/lib/meetings/insights";
import { formatTimestamp } from "@/lib/meetings/transcript";
import {
  formatDuration,
  formatMeetingDate,
  getMeetingDurationMs,
} from "@/lib/meetings/types";
import type {
  ActionItem,
  Meeting,
  MeetingSummary,
  TranscriptSegment,
} from "@/lib/supabase/types";
import type { ShareToken } from "@/lib/workflow/types";

type AdminClient = ReturnType<typeof createAdminClient>;

export type ResolvedShare = {
  token: ShareToken;
  meeting: Meeting;
  summary: MeetingSummary | null;
  actionItems: ActionItem[];
  segments: TranscriptSegment[];
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

  const [summaryRes, actionItemsRes, segmentsRes] = await Promise.all([
    admin
      .from("meeting_summaries")
      .select("*")
      .eq("meeting_id", meeting.id)
      .maybeSingle<MeetingSummary>(),
    admin
      .from("action_items")
      .select("*")
      .eq("meeting_id", meeting.id)
      .order("created_at", { ascending: true }),
    row.scope === "full_transcript"
      ? admin
          .from("transcript_segments")
          .select("*")
          .eq("meeting_id", meeting.id)
          .order("sequence", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (actionItemsRes.error) throw actionItemsRes.error;
  if (segmentsRes.error) throw segmentsRes.error;

  return {
    token: row,
    meeting,
    summary: summaryRes.data ?? null,
    actionItems: (actionItemsRes.data ?? []) as ActionItem[],
    segments: (segmentsRes.data ?? []) as TranscriptSegment[],
  };
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
