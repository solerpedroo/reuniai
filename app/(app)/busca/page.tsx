import { PageHeader } from "@/components/layout/page-header";
import { MeetingsDataTable } from "@/components/meetings/meetings-data-table";
import { searchMeetings } from "@/lib/meetings/queries";
import { createClient } from "@/lib/supabase/server";

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const term = q?.trim() ?? "";
  const supabase = await createClient();

  const page = term
    ? await searchMeetings(supabase, term, { limit: 50 })
    : { meetings: [], nextCursor: null };

  return (
    <div>
      <PageHeader
        title="Busca global"
        description="Pesquise por título de reunião ou trechos da transcrição."
        meta="Busca"
      />

      <MeetingsDataTable
        meetings={page.meetings}
        initialQuery={term}
        searchMode={Boolean(term)}
        showSearchInput
        searchAction="/busca"
      />
    </div>
  );
}
