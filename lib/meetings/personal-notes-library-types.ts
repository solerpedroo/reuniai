export type PersonalNoteLibraryEntry = {
  id: string;
  title: string;
  started_at: string;
  updated_at: string;
  preview: string;
};

export type PersonalNotesLibrarySummary = {
  total: number;
  entries: PersonalNoteLibraryEntry[];
};

export function previewPersonalNote(body: string, max = 120): string {
  const trimmed = body.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}
