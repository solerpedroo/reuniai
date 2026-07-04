import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { parseDecisions } from "@/lib/meetings/insights";
import { sendEmail, isEmailConfigured } from "@/lib/email/send";
import { emailButton, wrapEmailHtml } from "@/lib/brand/email-layout";
import { PRODUCT_NAME, getAppUrl } from "@/lib/brand/config";
import { getUserNotificationPrefs } from "@/lib/profile/notification-prefs";
import type { ActionItem, MeetingSummary } from "@/lib/supabase/types";

type AdminClient = ReturnType<typeof createAdminClient>;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendMeetingCompletedEmail(
  admin: AdminClient,
  meetingId: string
): Promise<void> {
  if (!isEmailConfigured()) return;

  const { data: meeting } = await admin
    .from("meetings")
    .select("id, user_id, title, started_at")
    .eq("id", meetingId)
    .maybeSingle();

  if (!meeting) return;

  const { data: authUser } = await admin.auth.admin.getUserById(meeting.user_id);
  const email = authUser.user?.email;
  if (!email) return;

  const prefs = await getUserNotificationPrefs(admin, meeting.user_id);
  if (!prefs.email || !prefs.completed) return;

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

  const appUrl = getAppUrl();
  const meetingUrl = `${appUrl}/reunioes/${meetingId}?revisar=1`;
  const title = escapeHtml(meeting.title);
  const executiveSummary = summary?.executive_summary
    ? escapeHtml(summary.executive_summary)
    : "Resumo disponível na plataforma.";

  const decisions = parseDecisions(summary?.decisions ?? []);
  const decisionsHtml =
    decisions.length > 0
      ? `<ul>${decisions.map((d) => `<li>${escapeHtml(d)}</li>`).join("")}</ul>`
      : "<p><em>Nenhuma decisão registrada.</em></p>";

  const itemsHtml =
    actionItems.length > 0
      ? `<ul>${actionItems
          .map((item) => {
            const assignee = item.assignee ? ` (${escapeHtml(item.assignee)})` : "";
            return `<li>${escapeHtml(item.title)}${assignee}</li>`;
          })
          .join("")}</ul>`
      : "<p><em>Nenhuma atribuição em aberto.</em></p>";

  const html = wrapEmailHtml({
    title: "Reunião processada",
    bodyHtml: `
      <p><strong>${title}</strong></p>
      <h2 style="font-size: 16px; margin-top: 24px;">Resumo executivo</h2>
      <p>${executiveSummary}</p>
      <h2 style="font-size: 16px; margin-top: 24px;">Decisões</h2>
      ${decisionsHtml}
      <h2 style="font-size: 16px; margin-top: 24px;">Atribuições em aberto</h2>
      ${itemsHtml}
      <p style="margin-top: 32px;">${emailButton(meetingUrl, `Ver reunião no ${PRODUCT_NAME}`)}</p>
    `,
    footerNote:
      "Você recebeu este email porque ativou notificações de reuniões concluídas. Desative em Configurações → Notificações.",
  });

  await sendEmail({
    to: email,
    subject: `Resumo: ${meeting.title}`,
    html,
    text: [
      `Reunião processada: ${meeting.title}`,
      "",
      summary?.executive_summary ?? "",
      "",
      `Ver reunião: ${meetingUrl}`,
    ].join("\n"),
  });
}
