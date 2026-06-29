"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { BookmarkSimple, Funnel } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MeetingListFilters, SavedView } from "@/lib/meetings/filter-queries";
import type { Tag } from "@/lib/workflow/types";
import {
  MEETING_PLATFORMS,
  MEETING_STATUSES,
  PLATFORM_LABELS,
  STATUS_LABELS,
} from "@/lib/meetings/types";
import type { MeetingPlatform, MeetingStatus } from "@/lib/supabase/types";

export function MeetingsFilterBar({
  tags,
  savedViews,
  initialFilters,
}: {
  tags: Tag[];
  savedViews: SavedView[];
  initialFilters: MeetingListFilters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value) params.delete(key);
        else params.set(key, value);
      }
      params.delete("cursor");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [pathname, router, searchParams]
  );

  const saveView = useCallback(async () => {
    const name = window.prompt("Nome da vista:");
    if (!name?.trim()) return;

    const view: SavedView = {
      id: crypto.randomUUID(),
      name: name.trim(),
      filters: {
        status: (searchParams.get("status") as MeetingStatus | null) ?? undefined,
        platform: (searchParams.get("platform") as MeetingPlatform | null) ?? undefined,
        tagId: searchParams.get("tag") ?? undefined,
        participant: searchParams.get("participant") ?? undefined,
        minDurationMin: searchParams.get("minDuration")
          ? Number(searchParams.get("minDuration"))
          : undefined,
        maxDurationMin: searchParams.get("maxDuration")
          ? Number(searchParams.get("maxDuration"))
          : undefined,
        openActionsOnly: searchParams.get("openActions") === "1",
      },
    };

    await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saved_views: [...savedViews, view] }),
    });

    router.refresh();
  }, [router, savedViews, searchParams]);

  return (
    <div className="surface-toolbar space-y-3 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Funnel size={16} className="text-muted-foreground" />
        <span className="text-sm font-medium">Filtros avançados</span>
        {pending && <span className="text-xs text-muted-foreground">Atualizando…</span>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          value={initialFilters.status ?? "all"}
          onValueChange={(v) =>
            updateParams({ status: v === "all" ? undefined : v })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {MEETING_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={initialFilters.platform ?? "all"}
          onValueChange={(v) =>
            updateParams({ platform: v === "all" ? undefined : v })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Plataforma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as plataformas</SelectItem>
            {MEETING_PLATFORMS.map((p) => (
              <SelectItem key={p} value={p}>
                {PLATFORM_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={initialFilters.tagId ?? "all"}
          onValueChange={(v) => updateParams({ tag: v === "all" ? undefined : v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as tags</SelectItem>
            {tags.map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>
                {tag.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Participante (nome ou email)"
          defaultValue={initialFilters.participant ?? ""}
          onBlur={(e) =>
            updateParams({ participant: e.target.value.trim() || undefined })
          }
        />

        <Input
          type="number"
          min={0}
          placeholder="Duração mín. (min)"
          defaultValue={initialFilters.minDurationMin ?? ""}
          onBlur={(e) =>
            updateParams({
              minDuration: e.target.value ? e.target.value : undefined,
            })
          }
        />

        <Input
          type="number"
          min={0}
          placeholder="Duração máx. (min)"
          defaultValue={initialFilters.maxDurationMin ?? ""}
          onBlur={(e) =>
            updateParams({
              maxDuration: e.target.value ? e.target.value : undefined,
            })
          }
        />

        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={Boolean(initialFilters.openActionsOnly)}
            onCheckedChange={(checked) =>
              updateParams({ openActions: checked ? "1" : undefined })
            }
          />
          Só com atribuições abertas
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {savedViews.map((view) => (
          <Button
            key={view.id}
            variant="outline"
            size="sm"
            onClick={() => {
              updateParams({
                status: view.filters.status,
                platform: view.filters.platform,
                tag: view.filters.tagId,
                participant: view.filters.participant,
                minDuration: view.filters.minDurationMin?.toString(),
                maxDuration: view.filters.maxDurationMin?.toString(),
                openActions: view.filters.openActionsOnly ? "1" : undefined,
              });
            }}
          >
            <BookmarkSimple size={14} className="mr-1" />
            {view.name}
          </Button>
        ))}
        <Button variant="ghost" size="sm" onClick={() => void saveView()}>
          Salvar vista atual
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(pathname)}
        >
          Limpar filtros
        </Button>
      </div>
    </div>
  );
}
