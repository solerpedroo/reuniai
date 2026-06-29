import { PageHeader } from "@/components/layout/page-header";
import { MeetingsDataTable } from "@/components/meetings/meetings-data-table";
import { getMeetingsForUser } from "@/lib/meetings/queries";
import { createClient } from "@/lib/supabase/server";

export default async function ReunioesPage() {
  const supabase = await createClient();
  const meetings = await getMeetingsForUser(supabase, 50);

  return (
    <div>
      <PageHeader
        title="Reuniões"
        description="Todas as reuniões gravadas pelo ReuniAI Bot, com status e filtros."
        meta="Biblioteca"
      />

      <MeetingsDataTable meetings={meetings} />
    </div>
  );
}
