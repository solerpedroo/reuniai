import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { SavedViewCreateForm } from "@/components/views/saved-view-create-form";
import { Button } from "@/components/ui/button";
import { getFoldersForUser } from "@/lib/folders/queries";
import { getSavedViews } from "@/lib/meetings/filter-queries";
import { MAX_SAVED_VIEWS } from "@/lib/meetings/saved-views-types";
import { createClient } from "@/lib/supabase/server";
import { getTagsForUser } from "@/lib/tags/queries";

export default async function NovaVistaPage({
  searchParams,
}: {
  searchParams: Promise<{ duplicate?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const [savedViews, tags, folders] = await Promise.all([
    getSavedViews(supabase),
    getTagsForUser(supabase),
    getFoldersForUser(supabase),
  ]);

  const duplicateFrom = params.duplicate
    ? savedViews.find((view) => view.id === params.duplicate)
    : undefined;

  if (savedViews.length >= MAX_SAVED_VIEWS) {
    return (
      <div>
        <PageHeader
          title="Nova vista"
          description={`Limite de ${MAX_SAVED_VIEWS} vistas atingido.`}
        />
        <div className="surface-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Exclua uma vista existente antes de criar outra.
          </p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link href="/vistas">Voltar à galeria</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Nova vista"
        description="Defina filtros e salve para reutilizar na lista de reuniões."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/vistas">Voltar</Link>
          </Button>
        }
      />
      <SavedViewCreateForm
        savedViews={savedViews}
        tags={tags}
        folders={folders.map((folder) => ({ id: folder.id, name: folder.name }))}
        duplicateFrom={duplicateFrom}
      />
    </div>
  );
}
