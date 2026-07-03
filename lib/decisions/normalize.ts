export function normalizeDecisionKey(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}
