import "server-only";

/** Chave estável para agrupar participantes (email preferido). */
export function participantKey(email: string | null | undefined, name: string): string {
  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail) return `email:${normalizedEmail}`;
  return `name:${normalizeNameKey(name)}`;
}

export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeNameKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function encodeParticipantKey(key: string): string {
  return encodeURIComponent(key);
}

export function decodeParticipantKey(encoded: string): string {
  return decodeURIComponent(encoded);
}

export function displayNameFromKey(key: string, fallback: string): string {
  if (key.startsWith("email:")) {
    return fallback || key.slice(6);
  }
  if (key.startsWith("name:")) {
    const slug = key.slice(5);
    return fallback || slug.replace(/-/g, " ");
  }
  return fallback || key;
}

/** Heurística: assignee de action item corresponde ao participante. */
export function assigneeMatchesParticipant(
  assignee: string | null | undefined,
  participantName: string,
  participantEmail: string | null
): boolean {
  if (!assignee?.trim()) return false;
  const normalizedAssignee = assignee.trim().toLowerCase();
  const email = normalizeEmail(participantEmail);
  if (email && normalizedAssignee.includes(email)) return true;

  const nameKey = normalizeNameKey(participantName);
  const assigneeKey = normalizeNameKey(assignee);
  if (nameKey && assigneeKey && (assigneeKey.includes(nameKey) || nameKey.includes(assigneeKey))) {
    return true;
  }

  return normalizedAssignee === participantName.trim().toLowerCase();
}
