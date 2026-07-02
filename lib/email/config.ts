import "server-only";

const DEFAULT_FROM = "ReuniAI <onboarding@resend.dev>";

export function getResendFromAddress(): string {
  return process.env.RESEND_FROM?.trim() || DEFAULT_FROM;
}

export function isResendSandboxMode(): boolean {
  return getResendFromAddress().toLowerCase().includes("@resend.dev");
}

export function getResendSandboxRecipient(): string | null {
  const raw = process.env.RESEND_SANDBOX_RECIPIENT?.trim();
  return raw ? raw.toLowerCase() : null;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export type EmailDeliveryCheck =
  | { allowed: true }
  | { allowed: false; reason: string };

export function checkEmailDelivery(recipient: string): EmailDeliveryCheck {
  if (!isEmailConfigured()) {
    return { allowed: false, reason: "RESEND_API_KEY não está configurada." };
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

export function getEmailDeliveryStatus(): {
  configured: boolean;
  sandbox: boolean;
  sandboxRecipient: string | null;
} {
  return {
    configured: isEmailConfigured(),
    sandbox: isResendSandboxMode(),
    sandboxRecipient: getResendSandboxRecipient(),
  };
}
