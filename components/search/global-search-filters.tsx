"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FOLDER_NONE } from "@/lib/folders/constants";
import {
  SEARCH_MODE_FILTERS,
  SEARCH_PERIODS,
  parseSearchModeFilter,
  parseSearchPeriod,
} from "@/lib/search/search-filters-types";

type FolderOption = { id: string; name: string };
type SeriesOption = { id: string; title: string };

export function GlobalSearchFilters({
  folders,
  series,
  embeddingsAvailable,
}: {
  folders: FolderOption[];
  series: SeriesOption[];
  embeddingsAvailable: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const period = parseSearchPeriod(searchParams.get("period") ?? undefined);
  const mode = parseSearchModeFilter(searchParams.get("modo") ?? undefined);
  const folderId = searchParams.get("pasta") ?? "all";
  const seriesId = searchParams.get("serie") ?? "all";

  function update(key: string, value: string | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
    startTransition(() => router.push(`/busca?${params.toString()}`));
  }

  return (
    <div className="surface-toolbar mb-4 space-y-3 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Filtros</span>
        {pending && <span className="text-xs text-muted-foreground">Atualizando…</span>}
        {!embeddingsAvailable && (
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700">
            Busca semântica indisponível
          </span>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Período</Label>
          <Select value={period} onValueChange={(value) => update("period", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEARCH_PERIODS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Modo</Label>
          <Select value={mode} onValueChange={(value) => update("modo", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEARCH_MODE_FILTERS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Pasta</Label>
          <Select
            value={folderId}
            onValueChange={(value) => update("pasta", value === "all" ? undefined : value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value={FOLDER_NONE}>Sem pasta</SelectItem>
              {folders.map((folder) => (
                <SelectItem key={folder.id} value={folder.id}>
                  {folder.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Série</Label>
          <Select
            value={seriesId}
            onValueChange={(value) => update("serie", value === "all" ? undefined : value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {series.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
