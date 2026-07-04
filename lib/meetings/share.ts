import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { parseDecisions, parseTopics } from "@/lib/meetings/insights";
import {
  parseSharePermissions,
  permissionsFromScope,
  type SharePermissions,
} from "@/lib/meetings/share-permissions";
import { formatTimestamp } from "@/lib/meetings/transcript";
import { computeTalkTime, type SpeakerTalkTime } from "@/lib/meetings/talk-time";
import {
  formatDuration,
  formatMeetingDateTime,
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
  permissions: SharePermissions;
  meeting: Meeting;
  summary: MeetingSummary | null;
  actionItems: ActionItem[];
  segments: TranscriptSegment[];
  talkTime: SpeakerTalkTime[];
  participants: ShareParticipant[];
};

function resolvePermissions(row: ShareToken): SharePermissions {
  if (row.permissions) {
    return parseSharePermissions(row.permissions);
  }
  return permissionsFromScope(row.scope);
}

function filterSummaryByPermissions(
  summary: MeetingSummary | null,
  permissions: SharePermissions
): MeetingSummary | null {
  if (!summary) return null;

  return {
    ...summary,
    executive_summary: permissions.executive_summary ? summary.executive_summary : null,
    topics: permissions.topics ? summary.topics : [],
    decisions: permissions.decisions ? summary.decisions : [],
  };
}

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

  const permissions = resolvePermissions(row);
  const needsSegments = permissions.transcript || permissions.talk_time;
  const needsSummary =
    permissions.executive_summary || permissions.topics || permissions.decisions;

  const { data: meeting } = await admin
    .from("meetings")
    .select("*")
    .eq("id", row.meeting_id)
    .maybeSingle<Meeting>();

  if (!meeting) return null;

  const [summaryRes, actionItemsRes, segmentsRes, participantsRes] = await Promise.all([
    needsSummary
      ? admin
          .from("meeting_summaries")
          .select("*")
          .eq("meeting_id", meeting.id)
          .maybeSingle<MeetingSummary>()
      : Promise.resolve({ data: null, error: null }),
    permissions.action_items
      ? admin
          .from("action_items")
          .select("*")
          .eq("meeting_id", meeting.id)
          .neq("status", "suggested")
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    needsSegments
      ? admin
          .from("transcript_segments")
          .select("*")
          .eq("meeting_id", meeting.id)
          .order("sequence", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    permissions.participants
      ? admin
          .from("participants")
          .select("name, email")
          .eq("meeting_id", meeting.id)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
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

    if (summary && permissions.executive_summary && summary.executive_summary) {
      texts.push(summary.executive_summary);
    }

    const topics = permissions.topics ? parseTopics(summary?.topics ?? []) : [];
    for (const topic of topics) texts.push(topic.title, topic.summary);

    const decisions = permissions.decisions ? parseDecisions(summary?.decisions ?? []) : [];
    texts.push(...decisions);

    if (permissions.action_items) {
      for (const item of actionItems) {
        texts.push(item.title);
        if (item.assignee) texts.push(item.assignee);
      }
    }

    if (permissions.transcript) {
      for (const segment of segments) {
        texts.push(segment.text, segment.speaker_label);
      }
    } else if (permissions.talk_time) {
      for (const segment of segments) {
        texts.push(segment.speaker_label);
      }
    }

    if (permissions.participants) {
      for (const participant of participants) {
        texts.push(participant.name);
        if (participant.email) texts.push(participant.email);
      }
    }

    if (texts.length > 0) {
      const { texts: redacted, audit } = await redactManyTexts(texts, { useLlm: true });
      let index = 0;
      const next = () => redacted[index++] ?? "";

      if (summary) {
        const redactedTopics = topics.map(() => ({ title: next(), summary: next() }));
        const redactedDecisions = decisions.map(() => next());
        summary = {
          ...summary,
          executive_summary:
            permissions.executive_summary && summary.executive_summary
              ? next()
              : summary.executive_summary,
          topics: permissions.topics ? redactedTopics : summary.topics,
          decisions: permissions.decisions ? redactedDecisions : summary.decisions,
        };
      }

      if (permissions.action_items) {
        actionItems = actionItems.map((item) => ({
          ...item,
          title: next(),
          assignee: item.assignee ? next() : item.assignee,
        }));
      }

      if (permissions.transcript) {
        segments = segments.map((segment) => ({
          ...segment,
          text: next(),
          speaker_label: next(),
        }));
      } else if (permissions.talk_time) {
        segments = segments.map((segment) => ({
          ...segment,
          speaker_label: next(),
        }));
      }

      if (permissions.participants) {
        participants = participants.map((participant) => ({
          name: next(),
          email: participant.email ? next() : participant.email,
        }));
      }

      await logExportAudit(admin, {
        userId: row.user_id,
        meetingId: meeting.id,
        format: "share_view",
        audit,
        shareTokenId: row.id,
      });
    }
  }

  summary = filterSummaryByPermissions(summary, permissions);

  const talkTime =
    permissions.talk_time && segments.length > 0 ? computeTalkTime(segments) : [];

  if (!permissions.transcript) {
    segments = [];
  }

  return {
    token: row,
    permissions,
    meeting,
    summary,
    actionItems,
    segments,
    talkTime,
    participants,
  };
}

export function buildShareSummaryText(
  meeting: Meeting,
  summary: MeetingSummary | null,
  actionItems: ActionItem[]
): string {
  const lines: string[] = [
    meeting.title,
    formatMeetingDateTime(meeting.started_at),
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
