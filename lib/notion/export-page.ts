import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { ActionItem, Meeting, MeetingSummary, TranscriptSegment } from "@/lib/supabase/types";
import { decryptToken } from "@/lib/crypto/token-encrypt";
import { parseDecisions, parseTopics } from "@/lib/meetings/insights";
import { formatTimestamp } from "@/lib/meetings/transcript";
import { formatMeetingDate } from "@/lib/meetings/types";
import { notionFetch } from "@/lib/notion/oauth";

type AdminClient = ReturnType<typeof createAdminClient>;

type NotionBlock = Record<string, unknown>;

function richText(content: string): NotionBlock[] {
  const chunks: NotionBlock[] = [];
  const max = 2000;
  for (let i = 0; i < content.length; i += max) {
    chunks.push({
      type: "text",
      text: { content: content.slice(i, i + max) },
    });
  }
  return chunks.length > 0 ? chunks : [{ type: "text", text: { content: "" } }];
}

function paragraph(text: string): NotionBlock {
  return { object: "block", type: "paragraph", paragraph: { rich_text: richText(text) } };
}

function heading(text: string, level: 1 | 2 | 3 = 2): NotionBlock {
  const key = `heading_${level}`;
  return { object: "block", type: key, [key]: { rich_text: richText(text) } };
}

function todo(text: string, checked: boolean): NotionBlock {
  return {
    object: "block",
    type: "to_do",
    to_do: { rich_text: richText(text), checked },
  };
}

function toggle(title: string, children: NotionBlock[]): NotionBlock {
  return {
    object: "block",
    type: "toggle",
    toggle: { rich_text: richText(title), children },
  };
}

async function loadMeetingData(admin: AdminClient, meetingId: string) {
  const { data: meeting } = await admin
    .from("meetings")
    .select("*")
    .eq("id", meetingId)
    .maybeSingle<Meeting>();

  if (!meeting) throw new Error("Reunião não encontrada.");

  const [summaryRes, actionItemsRes, segmentsRes] = await Promise.all([
    admin
      .from("meeting_summaries")
      .select("*")
      .eq("meeting_id", meetingId)
      .maybeSingle<MeetingSummary>(),
    admin
      .from("action_items")
      .select("*")
      .eq("meeting_id", meetingId)
      .neq("status", "suggested")
      .order("created_at", { ascending: true }),
    admin
      .from("transcript_segments")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("sequence", { ascending: true }),
  ]);

  return {
    meeting,
    summary: summaryRes.data,
    actionItems: (actionItemsRes.data ?? []) as ActionItem[],
    segments: (segmentsRes.data ?? []) as TranscriptSegment[],
  };
}

function buildNotionBlocks(
  meeting: Meeting,
  summary: MeetingSummary | null,
  actionItems: ActionItem[],
  segments: TranscriptSegment[]
): NotionBlock[] {
  const blocks: NotionBlock[] = [
    heading(meeting.title, 1),
    paragraph(
      `${formatMeetingDate(meeting.started_at)} · Plataforma: ${meeting.platform}`
    ),
    heading("Resumo executivo"),
    paragraph(summary?.executive_summary ?? "Sem resumo disponível."),
  ];

  const topics = parseTopics(summary?.topics ?? []);
  if (topics.length > 0) {
    blocks.push(heading("Tópicos"));
    for (const topic of topics) {
      blocks.push(paragraph(`• ${topic.title}: ${topic.summary}`));
    }
  }

  const decisions = parseDecisions(summary?.decisions ?? []);
  if (decisions.length > 0) {
    blocks.push(heading("Decisões"));
    for (const decision of decisions) {
      blocks.push(paragraph(`• ${decision}`));
    }
  }

  if (actionItems.length > 0) {
    blocks.push(heading("Action items"));
    for (const item of actionItems) {
      const label = item.assignee ? `${item.title} (${item.assignee})` : item.title;
      blocks.push(todo(label, item.status === "done"));
    }
  }

  if (segments.length > 0) {
    const transcriptChildren = segments.slice(0, 100).map((segment) =>
      paragraph(
        `[${formatTimestamp(segment.start_ms)}] ${segment.speaker_label}: ${segment.text}`
      )
    );
    blocks.push(toggle("Transcrição completa", transcriptChildren));
  }

  return blocks;
}

export async function exportMeetingToNotion(
  admin: AdminClient,
  userId: string,
  meetingId: string
): Promise<{ pageId: string; url: string }> {
  const { data: connection } = await admin
    .from("notion_connections")
    .select("access_token_encrypted")
    .eq("user_id", userId)
    .maybeSingle();

  if (!connection) throw new Error("Notion não conectado.");

  const { meeting, summary, actionItems, segments } = await loadMeetingData(admin, meetingId);
  if (meeting.user_id !== userId) throw new Error("Reunião não encontrada.");

  const accessToken = decryptToken(connection.access_token_encrypted);
  const blocks = buildNotionBlocks(meeting, summary, actionItems, segments);

  const res = await notionFetch(accessToken, "/pages", {
    method: "POST",
    body: JSON.stringify({
      parent: { type: "workspace", workspace: true },
      properties: {
        title: { title: richText(meeting.title) },
      },
      children: blocks.slice(0, 100),
    }),
  });

  if (!res.ok) {
    throw new Error(`Notion API: ${res.status} ${await res.text()}`);
  }

  const page = (await res.json()) as { id: string; url?: string };
  return {
    pageId: page.id,
    url: page.url ?? `https://notion.so/${page.id.replace(/-/g, "")}`,
  };
}
