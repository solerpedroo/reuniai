export type SearchPeriod = "7d" | "30d" | "90d" | "all";

export type SearchModeFilter = "auto" | "semantic" | "text";

export const SEARCH_PERIODS: { value: SearchPeriod; label: string }[] = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
  { value: "all", label: "Tudo" },
];

export const SEARCH_MODE_FILTERS: { value: SearchModeFilter; label: string }[] = [
  { value: "auto", label: "Automático" },
  { value: "semantic", label: "Semântico" },
  { value: "text", label: "Texto" },
];

export function parseSearchPeriod(value: string | undefined): SearchPeriod {
  if (value === "7d" || value === "30d" || value === "90d" || value === "all") return value;
  return "all";
}

export function parseSearchModeFilter(value: string | undefined): SearchModeFilter {
  if (value === "semantic" || value === "text" || value === "auto") return value;
  return "auto";
}

export type GlobalSearchOptions = {
  period?: SearchPeriod;
  folderId?: string;
  seriesId?: string;
  mode?: SearchModeFilter;
};

export function searchPeriodStart(period: SearchPeriod, now = new Date()): Date | null {
  if (period === "all") return null;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (period === "7d") start.setDate(start.getDate() - 6);
  else if (period === "30d") start.setDate(start.getDate() - 29);
  else if (period === "90d") start.setDate(start.getDate() - 89);
  return start;
}
