import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { GlobalSearchFilters } from "@/components/search/global-search-filters";
import { GlobalSearchResults } from "@/components/search/global-search-results";
import { isEmbeddingsConfigured } from "@/lib/embeddings/generate";
import { getFoldersForUser } from "@/lib/folders/queries";
import { globalSearch } from "@/lib/search/global-search";
import {
  parseSearchModeFilter,
  parseSearchPeriod,
} from "@/lib/search/search-filters-types";
import { getMeetingSeriesList } from "@/lib/series/queries";
import { createClient } from "@/lib/supabase/server";

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    period?: string;
    pasta?: string;
    serie?: string;
    modo?: string;
  }>;
}) {
  const params = await searchParams;
  const term = params.q?.trim() ?? "";
  const supabase = await createClient();

  const [result, folders, seriesList] = await Promise.all([
    term
      ? globalSearch(supabase, term, {
          period: parseSearchPeriod(params.period),
          folderId: params.pasta,
          seriesId: params.serie,
          mode: parseSearchModeFilter(params.modo),
        })
      : Promise.resolve({
          query: "",
          mode: "text" as const,
          hits: [],
          embeddingsAvailable: isEmbeddingsConfigured(),
        }),
    getFoldersForUser(supabase),
    getMeetingSeriesList(supabase),
  ]);

  return (
    <div>
      <PageHeader
        title="Busca global"
        description="Pesquise em título e transcrições de todas as suas reuniões."
        meta="Busca"
      />

      <form action="/busca" method="get" className="surface-toolbar mb-4 flex flex-wrap gap-2 p-3">
        <input type="hidden" name="period" value={params.period ?? "all"} />
        <input type="hidden" name="modo" value={params.modo ?? "auto"} />
        {params.pasta ? <input type="hidden" name="pasta" value={params.pasta} /> : null}
        {params.serie ? <input type="hidden" name="serie" value={params.serie} /> : null}
        <input
          type="search"
          name="q"
          defaultValue={term}
          placeholder="Ex.: o que decidimos sobre pricing?"
          className="h-10 min-w-[200px] flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none ring-brand focus-visible:ring-2"
        />
        <button
          type="submit"
          className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-medium text-brand-foreground"
        >
          Buscar
        </button>
      </form>

      <Suspense fallback={null}>
        <GlobalSearchFilters
          folders={folders.map((folder) => ({ id: folder.id, name: folder.name }))}
          series={seriesList.map((item) => ({ id: item.recurringEventId, title: item.title }))}
          embeddingsAvailable={result.embeddingsAvailable}
        />
      </Suspense>

      <GlobalSearchResults result={result} />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Quer ir além dos resultados?{" "}
        <a href="/assistente" className="text-brand hover:underline">
          Perguntar ao assistente global
        </a>
      </p>
    </div>
  );
}
