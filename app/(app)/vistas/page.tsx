import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { SavedViewsHubView } from "@/components/views/saved-views-hub-view";
import { Button } from "@/components/ui/button";
import { getSavedViewsHub } from "@/lib/meetings/saved-views-hub";
import { MAX_SAVED_VIEWS } from "@/lib/meetings/saved-views-types";
import { createClient } from "@/lib/supabase/server";

export default async function VistasPage() {
  const supabase = await createClient();
  const hub = await getSavedViewsHub(supabase);

  return (
    <div>
      <PageHeader
        title="Vistas salvas"
        description="Combinações de filtros da lista de reuniões — abra, renomeie ou exclua."
        meta={`${hub.views.length}/${MAX_SAVED_VIEWS}`}
        actions={
          hub.views.length < MAX_SAVED_VIEWS ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/vistas/nova">Nova vista</Link>
            </Button>
          ) : undefined
        }
      />
      <SavedViewsHubView views={hub.views} chipContext={hub.chipContext} />
    </div>
  );
}
