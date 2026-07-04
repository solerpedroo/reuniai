import "server-only";

/** @deprecated Import from @/lib/email/send */
export {
  sendEmail,
  isEmailConfigured,
  getEmailDeliveryStatus,
  EmailDeliveryError,
  ResendDeliveryError,
} from "@/lib/email/send";

export type { SendEmailInput } from "@/lib/email/types";
