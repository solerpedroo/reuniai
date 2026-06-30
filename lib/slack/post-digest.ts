import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { ActionItem, MeetingSummary } from "@/lib/supabase/types";
import { decryptToken } from "@/lib/crypto/token-encrypt";
import { parseDecisions } from "@/lib/meetings/insights";
import { postSlackMessage } from "@/lib/slack/oauth";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function postSlackMeetingDigest(
  admin: AdminClient,
  meetingId: string
): Promise<void> {
  const { data: meeting } = await admin
    .from("meetings")
    .select("id, user_id, title")
    .eq("id", meetingId)
    .maybeSingle();

  if (!meeting) return;

  const { data: connection } = await admin
    .from("slack_connections")
    .select("bot_token_encrypted, channel_id")
    .eq("user_id", meeting.user_id)
    .maybeSingle();

  if (!connection?.channel_id) return;

  const [summaryRes, actionItemsRes] = await Promise.all([
    admin
      .from("meeting_summaries")
      .select("*")
      .eq("meeting_id", meetingId)
      .maybeSingle<MeetingSummary>(),
    admin
      .from("action_items")
      .select("title, assignee, status")
      .eq("meeting_id", meetingId)
      .eq("status", "open")
      .limit(8),
  ]);

  const summary = summaryRes.data;
  const actionItems = (actionItemsRes.data ?? []) as Pick<
    ActionItem,
    "title" | "assignee" | "status"
  >[];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://reuniai.vercel.app";
  const meetingUrl = `${appUrl}/reunioes/${meetingId}`;

  const decisions = parseDecisions(summary?.decisions ?? []);
  const actionLines =
    actionItems.length > 0
      ? actionItems.map((item) => {
          const assignee = item.assignee ? ` — _${item.assignee}_` : "";
          return `• ${item.title}${assignee}`;
        })
      : ["_Nenhuma atribuição em aberto._"];

  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: `Reunião processada: ${meeting.title}` },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Resumo executivo*\n${summary?.executive_summary ?? "_Disponível no ReuniAI._"}`,
      },
    },
    ...(decisions.length > 0
      ? [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Decisões*\n${decisions.map((d) => `• ${d}`).join("\n")}`,
            },
          },
        ]
      : []),
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Atribuições em aberto*\n${actionLines.join("\n")}` },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Ver no ReuniAI" },
          url: meetingUrl,
        },
      ],
    },
  ];

  const botToken = decryptToken(connection.bot_token_encrypted);
  await postSlackMessage(
    botToken,
    connection.channel_id,
    blocks,
    `Reunião processada: ${meeting.title}`
  );
}
