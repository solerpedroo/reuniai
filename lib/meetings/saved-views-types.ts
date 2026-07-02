import type { MeetingListFilters, SavedView } from "@/lib/meetings/filter-queries";
import { FOLDER_NONE } from "@/lib/folders/constants";
import { PLATFORM_LABELS, STATUS_LABELS } from "@/lib/meetings/types";

export const MAX_SAVED_VIEWS = 20;

export type SavedViewChipContext = {
  tagNames: Record<string, string>;
  folderNames: Record<string, string>;
};

export function filtersToQueryString(filters: MeetingListFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.platform) params.set("platform", filters.platform);
  if (filters.tagId) params.set("tag", filters.tagId);
  if (filters.folderId) params.set("pasta", filters.folderId);
  if (filters.participant) params.set("participant", filters.participant);
  if (filters.minDurationMin != null) {
    params.set("minDuration", String(filters.minDurationMin));
  }
  if (filters.maxDurationMin != null) {
    params.set("maxDuration", String(filters.maxDurationMin));
  }
  if (filters.openActionsOnly) params.set("openActions", "1");
  return params.toString();
}

export function savedViewHref(view: SavedView): string {
  const qs = filtersToQueryString(view.filters);
  return qs ? `/reunioes?${qs}` : "/reunioes";
}

export function describeSavedViewFilters(
  filters: MeetingListFilters,
  context: SavedViewChipContext = { tagNames: {}, folderNames: {} }
): string[] {
  const chips: string[] = [];
  if (filters.status) chips.push(STATUS_LABELS[filters.status] ?? filters.status);
  if (filters.platform) chips.push(PLATFORM_LABELS[filters.platform] ?? filters.platform);
  if (filters.tagId) chips.push(context.tagNames[filters.tagId] ?? "Tag");
  if (filters.folderId) {
    if (filters.folderId === FOLDER_NONE) chips.push("Sem pasta");
    else chips.push(context.folderNames[filters.folderId] ?? "Pasta");
  }
  if (filters.participant) chips.push(`Participante: ${filters.participant}`);
  if (filters.minDurationMin != null) chips.push(`≥ ${filters.minDurationMin} min`);
  if (filters.maxDurationMin != null) chips.push(`≤ ${filters.maxDurationMin} min`);
  if (filters.openActionsOnly) chips.push("Atribuições abertas");
  return chips;
}

export function hasActiveFilters(filters: MeetingListFilters): boolean {
  return describeSavedViewFilters(filters).length > 0;
}
