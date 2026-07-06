/** Escapa wildcards do operador ILIKE do Postgres (% e _). */
export function escapeIlikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export function toIlikeContainsPattern(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "%";
  return `%${escapeIlikePattern(trimmed)}%`;
}
