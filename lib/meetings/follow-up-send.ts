import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { wrapEmailHtml } from "@/lib/brand/email-layout";
import { EmailDeliveryError, isEmailConfigured, sendEmail } from "@/lib/email/send";
import { EMAIL_UNAVAILABLE } from "@/lib/email/user-messages";
import type { MeetingFollowUp } from "@/lib/workflow/types";

type AdminClient = ReturnType<typeof createAdminClient>;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function bodyToHtml(body: string): string {
  return escapeHtml(body)
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function normalizeRecipients(emails: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of emails) {
    const email = raw.trim().toLowerCase();
    if (!email || !email.includes("@") || seen.has(email)) continue;
    seen.add(email);
    result.push(email);
  }
  return result;
}

export async function sendMeetingFollowUpEmail(
  admin: AdminClient,
  userId: string,
  meetingId: string,
  input: { to: string[]; subject: string; body: string }
): Promise<MeetingFollowUp> {
  if (!isEmailConfigured()) {
    throw new EmailDeliveryError(EMAIL_UNAVAILABLE, 503, "");
  }

  const recipients = normalizeRecipients(input.to);
  if (recipients.length === 0) {
    throw new EmailDeliveryError("Selecione ao menos um destinatário válido.", 400, "");
  }

  const subject = input.subject.trim();
  const body = input.body.trim();
  if (!subject || !body) {
    throw new EmailDeliveryError("Assunto e corpo são obrigatórios.", 400, "");
  }

  const { data: meeting } = await admin
    .from("meetings")
    .select("id, user_id, title")
    .eq("id", meetingId)
    .maybeSingle<{ id: string; user_id: string; title: string }>();

  if (!meeting || meeting.user_id !== userId) {
    throw new EmailDeliveryError("Reunião não encontrada.", 404, "");
  }

  const html = wrapEmailHtml({
    title: subject,
    bodyHtml: bodyToHtml(body),
    footerNote: `Follow-up enviado via ReuniAI sobre a reunião "${escapeHtml(meeting.title)}".`,
  });

  await sendEmail({
    to: recipients,
    subject,
    html,
    text: body,
  });

  const sentAt = new Date().toISOString();

  const { data, error } = await admin
    .from("meeting_follow_ups")
    .upsert(
      {
        meeting_id: meetingId,
        user_id: userId,
        subject,
        body,
        sent_at: sentAt,
        sent_to: recipients,
        follow_up_done_at: sentAt,
      },
      { onConflict: "meeting_id" }
    )
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Falha ao registrar envio");
  }

  return data as MeetingFollowUp;
}
