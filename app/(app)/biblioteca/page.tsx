import { PageHeader } from "@/components/layout/page-header";
import { LibraryHubView } from "@/components/library/library-hub-view";
import { getLibraryHub } from "@/lib/library/hub";
import { createClient } from "@/lib/supabase/server";

export default async function BibliotecaPage() {
  const supabase = await createClient();
  const hub = await getLibraryHub(supabase);

  return (
    <div>
      <PageHeader
        title="Biblioteca"
        description="Todas as ferramentas cross-meeting — prep, decisões, destaques, notas e busca."
        meta="Hub"
      />
      <LibraryHubView cards={hub.cards} />
    </div>
  );
}
