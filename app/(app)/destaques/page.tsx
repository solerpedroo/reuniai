import { PageHeader } from "@/components/layout/page-header";
import { HighlightsLibraryView } from "@/components/highlights/highlights-library-view";
import { getHighlightsLibrary } from "@/lib/meetings/highlights-library";
import { createClient } from "@/lib/supabase/server";

export default async function DestaquesPage() {
  const supabase = await createClient();
  const library = await getHighlightsLibrary(supabase);

  return (
    <div>
      <PageHeader
        title="Destaques"
        description="Momentos marcados em todas as suas reuniões — volte ao trecho exato com um clique."
        meta="Biblioteca"
      />
      <HighlightsLibraryView entries={library.entries} total={library.total} />
    </div>
  );
}
