import "server-only";

export type EmailProvider = "gmail" | "resend";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export type EmailDeliveryCheck =
  | { allowed: true }
  | { allowed: false; reason: string };

export type EmailDeliveryStatus = {
  configured: boolean;
  provider: EmailProvider | null;
  sandbox: boolean;
  sandboxRecipient: string | null;
  fromAddress: string | null;
};
