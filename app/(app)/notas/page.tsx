import { PageHeader } from "@/components/layout/page-header";
import { PersonalNotesLibraryView } from "@/components/notes/personal-notes-library-view";
import { getPersonalNotesLibrary } from "@/lib/meetings/personal-notes-library";
import { createClient } from "@/lib/supabase/server";

export default async function NotasPage() {
  const supabase = await createClient();
  const library = await getPersonalNotesLibrary(supabase);

  return (
    <div>
      <PageHeader
        title="Notas pessoais"
        description="Diário privado por reunião — separado do resumo da IA e dos share links."
        meta="Biblioteca"
      />
      <PersonalNotesLibraryView entries={library.entries} total={library.total} />
    </div>
  );
}
