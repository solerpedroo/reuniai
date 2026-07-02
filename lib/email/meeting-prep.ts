import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, isEmailConfigured } from "@/lib/email/resend";
import { emailButton, emailLink, wrapEmailHtml } from "@/lib/brand/email-layout";
import { getAppUrl } from "@/lib/brand/config";
import { prepNotificationHref } from "@/lib/notifications/hrefs";
import { getUserNotificationPrefs } from "@/lib/profile/notification-prefs";

type AdminClient = ReturnType<typeof createAdminClient>;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendMeetingPrepEmail(
  admin: AdminClient,
  meetingId: string,
  briefing: string,
  relatedMeetingId: string
): Promise<void> {
  if (!isEmailConfigured()) return;

  const { data: meeting } = await admin
    .from("meetings")
    .select("id, user_id, title, started_at, calendar_recurring_event_id")
    .eq("id", meetingId)
    .maybeSingle();

  if (!meeting) return;

  const prefs = await getUserNotificationPrefs(admin, meeting.user_id);
  if (!prefs.prep || !prefs.email) return;

  const { data: authUser } = await admin.auth.admin.getUserById(meeting.user_id);
  const email = authUser.user?.email;
  if (!email) return;

  const appUrl = getAppUrl();
  const meetingUrl = `${appUrl}${prepNotificationHref(meetingId)}`;
  const seriesUrl = meeting.calendar_recurring_event_id
    ? `${appUrl}/series/${encodeURIComponent(meeting.calendar_recurring_event_id)}`
    : `${appUrl}/reunioes/${relatedMeetingId}`;

  const startsAt = new Date(meeting.started_at).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  const html = wrapEmailHtml({
    title: "Prep de reunião",
    bodyHtml: `
      <p><strong>${escapeHtml(meeting.title)}</strong> · ${escapeHtml(startsAt)}</p>
      <p style="margin-top: 16px; line-height: 1.5;">${escapeHtml(briefing)}</p>
      <p style="margin-top: 32px;">
        ${emailButton(meetingUrl, "Ver reunião")}
        <span style="margin-left: 12px;">${emailLink(seriesUrl, "Histórico da série")}</span>
      </p>
    `,
    footerNote:
      "Você recebeu este email porque ativou notificações de prep. Desative em Configurações → Notificações.",
  });

  await sendEmail({
    to: email,
    subject: `Prep: ${meeting.title}`,
    html,
    text: [`Prep: ${meeting.title}`, "", briefing, "", `Ver reunião: ${meetingUrl}`].join("\n"),
  });
}
