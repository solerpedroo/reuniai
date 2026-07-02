"use client";

import Link from "next/link";
import { MagnifyingGlass, Quotes } from "@phosphor-icons/react";
import type { GlobalSearchResponse } from "@/lib/search/types";
import { formatSearchHitMeta } from "@/lib/search/types";
import { EmptyState } from "@/components/ui/empty-state";

export function GlobalSearchResults({
  result,
}: {
  result: GlobalSearchResponse;
}) {
  if (!result.query) {
    return (
      <EmptyState
        icon={MagnifyingGlass}
        tone="brand"
        title="Busca global"
        description="Pesquise por título ou conteúdo da transcrição em todas as suas reuniões. Com embeddings configurados, a busca usa similaridade semântica."
        className="py-16"
      />
    );
  }

  if (result.hits.length === 0) {
    return (
      <EmptyState
        icon={MagnifyingGlass}
        tone="default"
        title="Nenhum resultado"
        description={`Não encontramos trechos para "${result.query}". Tente outros termos ou sinônimos.`}
        className="py-12"
      />
    );
  }

  const grouped = result.hits.reduce<Map<string, typeof result.hits>>((map, hit) => {
    const list = map.get(hit.meetingId) ?? [];
    list.push(hit);
    map.set(hit.meetingId, list);
    return map;
  }, new Map());

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {result.hits.length} {result.hits.length === 1 ? "trecho" : "trechos"} · modo{" "}
        <span className="font-medium text-foreground">
          {result.mode === "semantic" ? "semântico" : "texto"}
        </span>
        {!result.embeddingsAvailable && result.mode === "text" && (
          <span className="ml-2 text-xs text-amber-700">(sem embeddings configurados)</span>
        )}
      </p>

      {[...grouped.entries()].map(([meetingId, hits]) => (
        <section key={meetingId} className="surface-card overflow-hidden">
          <div className="border-b border-border/70 px-5 py-4">
            <Link
              href={`/reunioes/${meetingId}`}
              className="text-sm font-semibold transition-colors hover:text-brand"
            >
              {hits[0]!.meetingTitle}
            </Link>
          </div>

          <ul className="divide-y divide-border/60">
            {hits.map((hit) => (
              <li key={`${hit.segmentId}-${hit.startMs}`}>
                <Link
                  href={
                    hit.startMs > 0
                      ? `/reunioes/${hit.meetingId}?t=${hit.startMs}`
                      : `/reunioes/${hit.meetingId}`
                  }
                  className="block px-5 py-4 transition-colors hover:bg-brand/5"
                >
                  <p className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Quotes size={12} />
                    {formatSearchHitMeta(hit)}
                  </p>
                  <p className="text-sm leading-relaxed text-foreground">{hit.snippet}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
