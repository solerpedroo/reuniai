import "server-only";

import {
  checkEmailDelivery,
  getResendFromAddress,
} from "@/lib/email/config";

export { isEmailConfigured } from "@/lib/email/config";

type SendEmailInput = {
  to: string;
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
  if (!apiKey) return;

  const delivery = checkEmailDelivery(input.to);
  if (!delivery.allowed) {
    console.warn(
      `[email] Envio ignorado para ${input.to} (${input.subject}): ${delivery.reason}`
    );
    return;
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
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!res.ok) {
    const responseBody = await res.text();
    const message = formatResendError(res.status, responseBody);
    console.error(
      `[email] Falha ao enviar para ${input.to} (${input.subject}): ${message}`
    );
    throw new ResendDeliveryError(message, res.status, responseBody);
  }
}
