import "server-only";

import type {
  EmailDeliveryCheck,
  EmailDeliveryStatus,
  EmailProvider,
} from "@/lib/email/types";

const DEFAULT_RESEND_FROM = "ReuniAI <onboarding@resend.dev>";

function normalizeProvider(value: string | undefined): EmailProvider | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "gmail" || normalized === "resend") return normalized;
  return null;
}

export function getEmailProvider(): EmailProvider | null {
  const explicit = normalizeProvider(process.env.EMAIL_PROVIDER);
  if (explicit) return explicit;

  const hasGmail =
    Boolean(process.env.GMAIL_USER?.trim()) &&
    Boolean(process.env.GMAIL_APP_PASSWORD?.trim());
  if (hasGmail) return "gmail";

  if (process.env.RESEND_API_KEY?.trim()) return "resend";

  return null;
}

export function isGmailConfigured(): boolean {
  return (
    Boolean(process.env.GMAIL_USER?.trim()) &&
    Boolean(process.env.GMAIL_APP_PASSWORD?.trim())
  );
}

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function isEmailConfigured(): boolean {
  const provider = getEmailProvider();
  if (provider === "gmail") return isGmailConfigured();
  if (provider === "resend") return isResendConfigured();
  return false;
}

export function getGmailUser(): string | null {
  const user = process.env.GMAIL_USER?.trim();
  return user ? user.toLowerCase() : null;
}

export function getGmailAppPassword(): string | null {
  const raw = process.env.GMAIL_APP_PASSWORD?.trim();
  if (!raw) return null;
  return raw.replace(/\s/g, "");
}

export function getResendFromAddress(): string {
  return process.env.RESEND_FROM?.trim() || DEFAULT_RESEND_FROM;
}

export function getEmailFromAddress(): string {
  const explicit = process.env.EMAIL_FROM?.trim();
  if (explicit) return explicit;

  const provider = getEmailProvider();
  if (provider === "gmail") {
    const user = getGmailUser();
    return user ? `ReuniAI <${user}>` : DEFAULT_RESEND_FROM;
  }

  return getResendFromAddress();
}

export function isResendSandboxMode(): boolean {
  return getEmailProvider() === "resend" && getResendFromAddress().toLowerCase().includes("@resend.dev");
}

export function getResendSandboxRecipient(): string | null {
  const raw = process.env.RESEND_SANDBOX_RECIPIENT?.trim();
  return raw ? raw.toLowerCase() : null;
}

export function checkEmailDelivery(recipient: string): EmailDeliveryCheck {
  const provider = getEmailProvider();

  if (!provider || !isEmailConfigured()) {
    return {
      allowed: false,
      reason:
        "Email não configurado. Defina EMAIL_PROVIDER=gmail com GMAIL_USER e GMAIL_APP_PASSWORD, ou RESEND_API_KEY.",
    };
  }

  if (provider === "gmail") {
    return { allowed: true };
  }

  if (!isResendSandboxMode()) {
    return { allowed: true };
  }

  const sandboxRecipient = getResendSandboxRecipient();
  const normalizedRecipient = recipient.trim().toLowerCase();

  if (!sandboxRecipient) {
    return {
      allowed: false,
      reason:
        "Resend em modo sandbox (onboarding@resend.dev): defina RESEND_SANDBOX_RECIPIENT com o email da sua conta Resend ou verifique um domínio em resend.com/domains.",
    };
  }

  if (normalizedRecipient !== sandboxRecipient) {
    return {
      allowed: false,
      reason: `Resend sandbox: emails só podem ir para ${sandboxRecipient} até você verificar um domínio e atualizar RESEND_FROM.`,
    };
  }

  return { allowed: true };
}

export function getEmailDeliveryStatus(): EmailDeliveryStatus {
  const provider = getEmailProvider();
  return {
    configured: isEmailConfigured(),
    provider,
    sandbox: isResendSandboxMode(),
    sandboxRecipient: getResendSandboxRecipient(),
    fromAddress: isEmailConfigured() ? getEmailFromAddress() : null,
  };
}
