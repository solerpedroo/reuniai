import "server-only";

import { getEmailProvider, isEmailConfigured } from "@/lib/email/config";
import { EmailDeliveryError } from "@/lib/email/errors";
import { sendViaGmail } from "@/lib/email/providers/gmail";
import { sendViaResend } from "@/lib/email/providers/resend";
import type { SendEmailInput } from "@/lib/email/types";

export { isEmailConfigured, getEmailDeliveryStatus } from "@/lib/email/config";
export { EmailDeliveryError, ResendDeliveryError } from "@/lib/email/errors";
export type { SendEmailInput } from "@/lib/email/types";

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const provider = getEmailProvider();

  if (!provider || !isEmailConfigured()) {
    throw new EmailDeliveryError(
      "Email não configurado. Defina EMAIL_PROVIDER=gmail (GMAIL_USER + GMAIL_APP_PASSWORD) ou RESEND_API_KEY.",
      503
    );
  }

  switch (provider) {
    case "gmail":
      return sendViaGmail(input);
    case "resend":
      return sendViaResend(input);
    default:
      throw new EmailDeliveryError(`Provedor de email desconhecido: ${provider}`, 503);
  }
}
