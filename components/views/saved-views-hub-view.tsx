"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { BookmarkSimple, PencilSimple, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { SavedView } from "@/lib/meetings/filter-queries";
import {
  describeSavedViewFilters,
  MAX_SAVED_VIEWS,
  savedViewHref,
  type SavedViewChipContext,
} from "@/lib/meetings/saved-views-types";
import { cn } from "@/lib/utils";

export function SavedViewsHubView({
  views: initialViews,
  chipContext,
}: {
  views: SavedView[];
  chipContext: SavedViewChipContext;
}) {
  const router = useRouter();
  const [views, setViews] = useState(initialViews);

  const persist = useCallback(
    async (next: SavedView[]) => {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saved_views: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Falha ao salvar");
      }
      setViews(next);
      router.refresh();
    },
    [router]
  );

  const rename = useCallback(
    async (view: SavedView) => {
      const name = window.prompt("Novo nome da vista:", view.name);
      if (!name?.trim() || name.trim() === view.name) return;
      try {
        await persist(
          views.map((item) =>
            item.id === view.id ? { ...item, name: name.trim() } : item
          )
        );
        toast.success("Vista renomeada");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao renomear");
      }
    },
    [persist, views]
  );

  const remove = useCallback(
    async (view: SavedView) => {
      if (!confirm(`Excluir a vista "${view.name}"?`)) return;
      try {
        await persist(views.filter((item) => item.id !== view.id));
        toast.success("Vista excluída");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao excluir");
      }
    },
    [persist, views]
  );

  if (views.length === 0) {
    return (
      <div className="surface-card p-10 text-center">
        <BookmarkSimple size={32} className="mx-auto mb-3 text-muted-foreground/50" aria-hidden />
        <p className="text-sm font-medium">Nenhuma vista salva</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Filtre reuniões em /reunioes e salve combinações que você usa com frequência.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/reunioes">Ir para reuniões</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/vistas/nova">Criar vista</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {views.length} de {MAX_SAVED_VIEWS} vistas
        </p>
        <Button variant="outline" size="sm" asChild disabled={views.length >= MAX_SAVED_VIEWS}>
          <Link href="/vistas/nova">Nova vista</Link>
        </Button>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {views.map((view) => {
          const chips = describeSavedViewFilters(view.filters, chipContext);
          return (
            <li key={view.id} className="surface-card flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={savedViewHref(view)}
                  className="font-medium hover:text-brand"
                >
                  {view.name}
                </Link>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label="Renomear vista"
                    onClick={() => void rename(view)}
                  >
                    <PencilSimple size={14} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground"
                    aria-label="Excluir vista"
                    onClick={() => void remove(view)}
                  >
                    <Trash size={14} />
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {chips.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Sem filtros</span>
                ) : (
                  chips.map((chip) => (
                    <span
                      key={chip}
                      className={cn(
                        "rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                      )}
                    >
                      {chip}
                    </span>
                  ))
                )}
              </div>

              <Button variant="link" size="sm" className="mt-3 h-auto self-start px-0" asChild>
                <Link href={savedViewHref(view)}>Abrir em reuniões</Link>
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
