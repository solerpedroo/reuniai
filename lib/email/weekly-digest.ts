import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, isEmailConfigured } from "@/lib/email/send";
import { emailButton, wrapEmailHtml } from "@/lib/brand/email-layout";
import { PRODUCT_NAME, getAppUrl } from "@/lib/brand/config";
import { getWeeklyDigestStats } from "@/lib/digest/weekly-stats";
import { isoWeekKeyFromDate, weekHref } from "@/lib/review/week-utils";
import { getUserNotificationPrefs } from "@/lib/profile/notification-prefs";

type AdminClient = ReturnType<typeof createAdminClient>;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatHours(ms: number): string {
  const hours = ms / 3_600_000;
  if (hours < 1) return `${Math.round(ms / 60_000)} min`;
  return `${hours.toFixed(1).replace(".", ",")} h`;
}

function formatDueDate(date: string): string {
  try {
    return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return date;
  }
}

export async function sendWeeklyDigestEmail(
  admin: AdminClient,
  userId: string
): Promise<boolean> {
  if (!isEmailConfigured()) return false;

  const prefs = await getUserNotificationPrefs(admin, userId);
  if (!prefs.email || !prefs.digest) return false;

  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  const email = authUser.user?.email;
  if (!email) return false;

  const stats = await getWeeklyDigestStats(admin, userId);
  if (stats.meetingCount === 0 && stats.dueActionItems.length === 0) {
    return false;
  }

  const appUrl = getAppUrl();
  const weekKey = isoWeekKeyFromDate(new Date());
  const reviewUrl = `${appUrl}${weekHref(weekKey)}`;

  const decisionsHtml =
    stats.topDecisions.length > 0
      ? `<ul>${stats.topDecisions.map((d) => `<li>${escapeHtml(d)}</li>`).join("")}</ul>`
      : "<p><em>Nenhuma decisão registrada esta semana.</em></p>";

  const dueHtml =
    stats.dueActionItems.length > 0
      ? `<ul>${stats.dueActionItems
          .map((item) => {
            const assignee = item.assignee ? ` (${escapeHtml(item.assignee)})` : "";
            const due = item.due_date ? ` — ${formatDueDate(item.due_date)}` : "";
            return `<li>${escapeHtml(item.title)}${assignee}${due}</li>`;
          })
          .join("")}</ul>`
      : "<p><em>Nenhuma atribuição com prazo nos próximos 7 dias.</em></p>";

  const html = wrapEmailHtml({
    title: "Resumo semanal",
    bodyHtml: `
      <p>Sua semana no ${PRODUCT_NAME}:</p>
      <ul>
        <li><strong>${stats.meetingCount}</strong> reuniões processadas</li>
        <li><strong>${formatHours(stats.hoursRecordedMs)}</strong> gravadas</li>
      </ul>
      <h2 style="font-size: 16px; margin-top: 24px;">Principais decisões</h2>
      ${decisionsHtml}
      <h2 style="font-size: 16px; margin-top: 24px;">Atribuições com prazo</h2>
      ${dueHtml}
      <p style="margin-top: 32px;">${emailButton(reviewUrl, "Ver revisão da semana")}</p>
    `,
    footerNote:
      "Digest semanal enviado aos domingos. Desative em Configurações → Notificações.",
  });

  await sendEmail({
    to: email,
    subject: `Resumo semanal — ${stats.meetingCount} reuniões`,
    html,
    text: [
      "Resumo semanal ReuniAI",
      `${stats.meetingCount} reuniões · ${formatHours(stats.hoursRecordedMs)} gravadas`,
      "",
      `Ver revisão da semana: ${reviewUrl}`,
    ].join("\n"),
  });

  await admin
    .from("profiles")
    .update({ last_weekly_digest_at: new Date().toISOString() })
    .eq("id", userId);

  return true;
}
