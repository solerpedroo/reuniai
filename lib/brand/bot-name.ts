import { PRODUCT_NAME } from "@/lib/brand/config";

/**
 * Padrão exibido na call: `ReuniAI - Pedro Soler`.
 *
 * Prioridade: nome do anfitrião (personalizado) > NEXT_PUBLIC_BOT_NAME (fallback
 * genérico para contextos sem usuário) > `ReuniAI Bot`. O env é apenas fallback —
 * nunca sobrescreve o nome personalizado do usuário.
 */
export function formatBotDisplayName(hostName: string | null | undefined): string {
  const trimmed = hostName?.trim();
  if (trimmed) return `${PRODUCT_NAME} - ${trimmed}`;

  const envFallback = process.env.NEXT_PUBLIC_BOT_NAME?.trim();
  if (envFallback) return envFallback;

  return `${PRODUCT_NAME} Bot`;
}

type ResolveHostDisplayNameInput = {
  displayName?: string | null;
  email?: string | null;
  metadataFullName?: string | null;
};

/** Resolve o nome do anfitrião para compor o nome do bot na call. */
export function resolveHostDisplayName(input: ResolveHostDisplayNameInput): string | null {
  const fromProfile = input.displayName?.trim();
  if (fromProfile) return fromProfile;

  const fromMeta = input.metadataFullName?.trim();
  if (fromMeta) return fromMeta;

  const email = input.email?.trim();
  if (email?.includes("@")) {
    const local = email.split("@")[0] ?? "";
    const words = local.split(/[._-]+/).filter(Boolean);
    if (words.length > 0) {
      return words
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
    }
  }

  return null;
}

export function buildBotDisplayName(input: ResolveHostDisplayNameInput): string {
  return formatBotDisplayName(resolveHostDisplayName(input));
}
