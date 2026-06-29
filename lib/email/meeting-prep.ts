import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, isEmailConfigured } from "@/lib/email/resend";
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://reuniai.vercel.app";
  const meetingUrl = `${appUrl}/reunioes/${meetingId}`;
  const seriesUrl = meeting.calendar_recurring_event_id
    ? `${appUrl}/series/${encodeURIComponent(meeting.calendar_recurring_event_id)}`
    : `${appUrl}/reunioes/${relatedMeetingId}`;

  const startsAt = new Date(meeting.started_at).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 560px; color: #111;">
      <h1 style="font-size: 20px;">Prep de reunião</h1>
      <p><strong>${escapeHtml(meeting.title)}</strong> · ${escapeHtml(startsAt)}</p>
      <p style="margin-top: 16px; line-height: 1.5;">${escapeHtml(briefing)}</p>
      <p style="margin-top: 32px;">
        <a href="${meetingUrl}" style="background: #6366f1; color: #fff; padding: 10px 16px; border-radius: 8px; text-decoration: none; margin-right: 8px;">
          Ver reunião
        </a>
        <a href="${seriesUrl}" style="color: #6366f1; text-decoration: none;">
          Histórico da série
        </a>
      </p>
      <p style="margin-top: 24px; font-size: 12px; color: #666;">
        Você recebeu este email porque ativou notificações de prep.
        Desative em Configurações → Notificações.
      </p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: `Prep: ${meeting.title}`,
    html,
    text: [`Prep: ${meeting.title}`, "", briefing, "", `Ver reunião: ${meetingUrl}`].join("\n"),
  });
}
