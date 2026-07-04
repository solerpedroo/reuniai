import "server-only";

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

import {
  checkEmailDelivery,
  getEmailFromAddress,
  getGmailAppPassword,
  getGmailUser,
} from "@/lib/email/config";
import { EmailDeliveryError } from "@/lib/email/errors";
import { EMAIL_SEND_FAILED, EMAIL_UNAVAILABLE } from "@/lib/email/user-messages";
import type { SendEmailInput } from "@/lib/email/types";

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const user = getGmailUser();
  const pass = getGmailAppPassword();

  if (!user || !pass) {
    throw new EmailDeliveryError(EMAIL_UNAVAILABLE, 503);
  }

  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });

  return transporter;
}

function normalizeRecipients(input: string | string[]): string[] {
  return (Array.isArray(input) ? input : [input])
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function sendViaGmail(input: SendEmailInput): Promise<void> {
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

  const from = getEmailFromAddress();

  try {
    await getTransporter().sendMail({
      from,
      to: recipients,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Falha ao enviar email via Gmail SMTP.";
    console.error(
      `[email:gmail] Falha ao enviar para ${recipients.join(", ")} (${input.subject}): ${message}`
    );
    throw new EmailDeliveryError(EMAIL_SEND_FAILED, 502);
  }
}
