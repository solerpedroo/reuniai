import "server-only";

import {
  checkEmailDelivery,
  getResendFromAddress,
} from "@/lib/email/config";

export { isEmailConfigured } from "@/lib/email/config";

type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export class ResendDeliveryError extends Error {
  readonly status: number;
  readonly responseBody: string;

  constructor(message: string, status: number, responseBody: string) {
    super(message);
    this.name = "ResendDeliveryError";
    this.status = status;
    this.responseBody = responseBody;
  }
}

function formatResendError(status: number, responseBody: string): string {
  try {
    const parsed = JSON.parse(responseBody) as { message?: string };
    if (parsed.message) return parsed.message;
  } catch {
    // ignore parse errors
  }

  return `Resend retornou HTTP ${status}`;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new ResendDeliveryError(
      "RESEND_API_KEY não está configurada.",
      503,
      ""
    );
  }

  const recipients = (Array.isArray(input.to) ? input.to : [input.to])
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (recipients.length === 0) {
    throw new ResendDeliveryError("Nenhum destinatário informado.", 400, "");
  }

  for (const recipient of recipients) {
    const delivery = checkEmailDelivery(recipient);
    if (!delivery.allowed) {
      throw new ResendDeliveryError(delivery.reason, 400, "");
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
      `[email] Falha ao enviar para ${recipients.join(", ")} (${input.subject}): ${message}`
    );
    throw new ResendDeliveryError(message, res.status, responseBody);
  }
}
