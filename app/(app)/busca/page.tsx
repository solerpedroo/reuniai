import { PageHeader } from "@/components/layout/page-header";
import { GlobalSearchResults } from "@/components/search/global-search-results";
import { globalSearch } from "@/lib/search/global-search";
import { createClient } from "@/lib/supabase/server";

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const term = q?.trim() ?? "";
  const supabase = await createClient();

  const result = term ? await globalSearch(supabase, term) : { query: "", mode: "text" as const, hits: [] };

  return (
    <div>
      <PageHeader
        title="Busca global"
        description="Pesquise em título e transcrições de todas as suas reuniões."
        meta="Busca"
      />

      <form action="/busca" method="get" className="surface-toolbar mb-6 flex gap-2 p-3">
        <input
          type="search"
          name="q"
          defaultValue={term}
          placeholder="Ex.: o que decidimos sobre pricing?"
          className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none ring-brand focus-visible:ring-2"
        />
        <button
          type="submit"
          className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-medium text-brand-foreground"
        >
          Buscar
        </button>
      </form>

      <GlobalSearchResults result={result} />
    </div>
  );
}
