import "server-only";

import {
  previewPersonalNote,
  type PersonalNoteLibraryEntry,
  type PersonalNotesLibrarySummary,
} from "@/lib/meetings/personal-notes-library-types";
import type { createClient } from "@/lib/supabase/server";
import type { Meeting } from "@/lib/supabase/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export type { PersonalNoteLibraryEntry, PersonalNotesLibrarySummary } from "@/lib/meetings/personal-notes-library-types";
export { previewPersonalNote } from "@/lib/meetings/personal-notes-library-types";

export async function getPersonalNotesLibrary(
  supabase: Client,
  options: { limit?: number } = {}
): Promise<PersonalNotesLibrarySummary> {
  const limit = options.limit ?? 100;

  const { data, error, count } = await supabase
    .from("meetings")
    .select("id, title, started_at, updated_at, personal_notes", { count: "exact" })
    .not("personal_notes", "is", null)
    .neq("personal_notes", "")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  type Row = Pick<
    Meeting,
    "id" | "title" | "started_at" | "updated_at" | "personal_notes"
  >;

  const entries = ((data ?? []) as Row[]).map((meeting) => {
    return {
      id: meeting.id,
      title: meeting.title,
      started_at: meeting.started_at,
      updated_at: meeting.updated_at,
      preview: previewPersonalNote(meeting.personal_notes ?? ""),
    } satisfies PersonalNoteLibraryEntry;
  });

  return { total: count ?? entries.length, entries };
}

export async function countPersonalNotesLibrary(supabase: Client): Promise<number> {
  const { count, error } = await supabase
    .from("meetings")
    .select("*", { count: "exact", head: true })
    .not("personal_notes", "is", null)
    .neq("personal_notes", "");

  if (error) throw error;
  return count ?? 0;
}
