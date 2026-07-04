import "server-only";

import {
  checkEmailDelivery,
  getResendFromAddress,
} from "@/lib/email/config";
import { EmailDeliveryError } from "@/lib/email/errors";
import type { SendEmailInput } from "@/lib/email/types";

function formatResendError(status: number, responseBody: string): string {
  try {
    const parsed = JSON.parse(responseBody) as { message?: string };
    if (parsed.message) return parsed.message;
  } catch {
    // ignore parse errors
  }

  return `Resend retornou HTTP ${status}`;
}

function normalizeRecipients(input: string | string[]): string[] {
  return (Array.isArray(input) ? input : [input])
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function sendViaResend(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new EmailDeliveryError("RESEND_API_KEY não está configurada.", 503);
  }

  const recipients = normalizeRecipients(input.to);

  if (recipients.length === 0) {
    throw new EmailDeliveryError("Nenhum destinatário informado.", 400);
  }

  for (const recipient of recipients) {
    const delivery = checkEmailDelivery(recipient);
    if (!delivery.allowed) {
      throw new EmailDeliveryError(delivery.reason, 400);
    }
  }

  const from = getResendFromAddress();

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: recipients,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!res.ok) {
    const responseBody = await res.text();
    const message = formatResendError(res.status, responseBody);
    console.error(
      `[email:resend] Falha ao enviar para ${recipients.join(", ")} (${input.subject}): ${message}`
    );
    throw new EmailDeliveryError(message, res.status, responseBody);
  }
}
