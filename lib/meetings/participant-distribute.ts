import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { wrapEmailHtml } from "@/lib/brand/email-layout";
import { EmailDeliveryError, isEmailConfigured, sendEmail } from "@/lib/email/send";
import { getActionItems, getMeetingSummary } from "@/lib/meetings/insights";
import {
  DEFAULT_SHARE_PERMISSIONS,
  normalizeSharePermissions,
} from "@/lib/meetings/share-permissions";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;
type AdminClient = ReturnType<typeof createAdminClient>;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function itemsForRecipient(
  assignee: string | null,
  recipientEmail: string,
  items: { title: string; assignee: string | null; due_date: string | null }[]
) {
  const local = recipientEmail.split("@")[0]?.toLowerCase();
  return items.filter((item) => {
    if (!item.assignee) return false;
    const a = item.assignee.toLowerCase();
    return a.includes(recipientEmail) || (local && a.includes(local));
  });
}

export async function distributeMeetingSummary(
  admin: AdminClient,
  userId: string,
  meetingId: string,
  input: { recipients: string[]; includeShareLink?: boolean }
): Promise<{ sent: number; shareUrl?: string }> {
  if (!isEmailConfigured()) {
    throw new EmailDeliveryError(
      "Envio por email não configurado. Defina Gmail (GMAIL_USER + GMAIL_APP_PASSWORD) ou Resend (RESEND_API_KEY).",
      503,
      ""
    );
  }

  const recipients = normalizeRecipients(input.recipients);
  if (recipients.length === 0) {
    throw new EmailDeliveryError("Informe ao menos um email válido.", 400, "");
  }

  const { data: meeting } = await admin
    .from("meetings")
    .select("id, user_id, title, started_at")
    .eq("id", meetingId)
    .maybeSingle<{ id: string; user_id: string; title: string; started_at: string }>();

  if (!meeting || meeting.user_id !== userId) {
    throw new EmailDeliveryError("Reunião não encontrada.", 404, "");
  }

  const supabase = admin as unknown as Client;
  const summary = await getMeetingSummary(supabase, meetingId);
  if (!summary) {
    throw new EmailDeliveryError("Reunião ainda não analisada.", 400, "");
  }

  const actionItems = await getActionItems(supabase, meetingId);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  let shareUrl: string | undefined;
  let shareTokenId: string | undefined;

  if (input.includeShareLink !== false) {
    const permissions = normalizeSharePermissions(DEFAULT_SHARE_PERMISSIONS);
    const expiresAt = new Date(Date.now() + 7 * 86_400_000).toISOString();
    const { data: token } = await admin
      .from("share_tokens")
      .insert({
        meeting_id: meetingId,
        user_id: userId,
        scope: "summary_only",
        expires_at: expiresAt,
        permissions,
        redact_pii: true,
      })
      .select("id, token")
      .single();

    if (token) {
      shareTokenId = token.id;
      shareUrl = `${appUrl}/s/${token.token}`;
    }
  }

  const subject = `Resumo: ${meeting.title}`;
  let sent = 0;

  for (const email of recipients) {
    const personalItems = itemsForRecipient(null, email, actionItems);
    const itemsBlock =
      personalItems.length > 0
        ? personalItems.map((i) => `• ${i.title}${i.due_date ? ` (até ${i.due_date})` : ""}`).join("\n")
        : actionItems.slice(0, 5).map((i) => `• ${i.title}`).join("\n");

    const body = [
      `Olá,`,
      "",
      `Segue o resumo da reunião "${meeting.title}":`,
      "",
      summary.executive_summary,
      "",
      "Encaminhamentos:",
      itemsBlock || "—",
      shareUrl ? `\nVer detalhes: ${shareUrl}` : "",
      "",
      "— Enviado via ReuniAI",
    ]
      .filter(Boolean)
      .join("\n");

    const html = wrapEmailHtml({
      title: subject,
      bodyHtml: escapeHtml(body).replace(/\n/g, "<br />"),
      footerNote: "Você recebeu este resumo porque participou da reunião.",
    });

    await sendEmail({ to: [email], subject, html, text: body });

    await admin.from("participant_digests").insert({
      meeting_id: meetingId,
      user_id: userId,
      recipient_email: email,
      subject,
      body,
      share_token_id: shareTokenId ?? null,
    });

    sent += 1;
  }

  return { sent, shareUrl };
}
