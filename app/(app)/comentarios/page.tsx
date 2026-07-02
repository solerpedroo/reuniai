import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { CommentsLibraryView } from "@/components/comments/comments-library-view";
import { Button } from "@/components/ui/button";
import { getCommentsLibrary } from "@/lib/meetings/comments-library";
import { createClient } from "@/lib/supabase/server";

export default async function ComentariosPage({
  searchParams,
}: {
  searchParams: Promise<{ meeting?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const library = await getCommentsLibrary(supabase, {
    meetingId: params.meeting,
  });

  return (
    <div>
      <PageHeader
        title="Comentários"
        description="Anotações na timeline de todas as suas reuniões — volte ao trecho exato."
        meta="Biblioteca"
        actions={
          params.meeting ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/comentarios">Ver todas</Link>
            </Button>
          ) : undefined
        }
      />
      <CommentsLibraryView
        entries={library.entries}
        total={library.total}
        meetingFilter={params.meeting}
      />
    </div>
  );
}
