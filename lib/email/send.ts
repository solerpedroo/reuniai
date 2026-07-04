import "server-only";

import { getEmailProvider, isEmailConfigured } from "@/lib/email/config";
import { EmailDeliveryError } from "@/lib/email/errors";
import { EMAIL_SEND_FAILED, EMAIL_UNAVAILABLE } from "@/lib/email/user-messages";
import { sendViaGmail } from "@/lib/email/providers/gmail";
import { sendViaResend } from "@/lib/email/providers/resend";
import type { SendEmailInput } from "@/lib/email/types";

export { isEmailConfigured, getEmailDeliveryStatus } from "@/lib/email/config";
export { EmailDeliveryError, ResendDeliveryError } from "@/lib/email/errors";
export type { SendEmailInput } from "@/lib/email/types";

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const provider = getEmailProvider();

  if (!provider || !isEmailConfigured()) {
    throw new EmailDeliveryError(EMAIL_UNAVAILABLE, 503);
  }

  switch (provider) {
    case "gmail":
      return sendViaGmail(input);
    case "resend":
      return sendViaResend(input);
    default:
      throw new EmailDeliveryError(EMAIL_SEND_FAILED, 503);
  }
}
