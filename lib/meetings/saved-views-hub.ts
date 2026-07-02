import "server-only";

import { getFoldersForUser } from "@/lib/folders/queries";
import { getSavedViews, type SavedView } from "@/lib/meetings/filter-queries";
import type { SavedViewChipContext } from "@/lib/meetings/saved-views-types";
import type { createClient } from "@/lib/supabase/server";
import { getTagsForUser } from "@/lib/tags/queries";

type Client = Awaited<ReturnType<typeof createClient>>;

export type SavedViewsHub = {
  views: SavedView[];
  chipContext: SavedViewChipContext;
};

export async function getSavedViewsHub(supabase: Client): Promise<SavedViewsHub> {
  const [views, tags, folders] = await Promise.all([
    getSavedViews(supabase),
    getTagsForUser(supabase),
    getFoldersForUser(supabase),
  ]);

  const chipContext: SavedViewChipContext = {
    tagNames: Object.fromEntries(tags.map((tag) => [tag.id, tag.name])),
    folderNames: Object.fromEntries(folders.map((folder) => [folder.id, folder.name])),
  };

  return { views, chipContext };
}
