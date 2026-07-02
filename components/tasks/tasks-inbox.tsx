"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle, Sparkle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TasksInboxFilters } from "@/components/tasks/tasks-inbox-filters";
import { TasksInboxItem } from "@/components/tasks/tasks-inbox-item";
import {
  INBOX_FILTER_LABELS,
  type InboxActionItem,
  type InboxCounts,
  type InboxFilterOptions,
  type InboxQuery,
} from "@/lib/meetings/action-items-inbox";

type TasksInboxProps = {
  query: InboxQuery;
  items: InboxActionItem[];
  counts: InboxCounts;
  options: InboxFilterOptions;
};

function groupByMeeting(items: InboxActionItem[]): Map<string, InboxActionItem[]> {
  const map = new Map<string, InboxActionItem[]>();
  for (const item of items) {
    const list = map.get(item.meeting_id) ?? [];
    list.push(item);
    map.set(item.meeting_id, list);
  }
  return map;
}

export function TasksInbox({ query, items, counts, options }: TasksInboxProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const isSuggestedView = query.filter === "suggested";
  const suggestedItems = isSuggestedView ? items : [];

  async function patchItem(
    item: InboxActionItem,
    body: Record<string, unknown>
  ): Promise<boolean> {
    const res = await fetch(`/api/meetings/${item.meeting_id}/action-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      toast.error("Não foi possível atualizar o item.");
      return false;
    }
    router.refresh();
    return true;
  }

  async function toggleItem(item: InboxActionItem) {
    const next = item.status === "done" ? "open" : "done";
    const ok = await patchItem(item, { status: next });
    if (ok) toast.success(next === "done" ? "Item concluído." : "Item reaberto.");
  }

  async function saveItem(
    item: InboxActionItem,
    patch: { title?: string; assignee?: string | null; due_date?: string | null }
  ) {
    setBusy(true);
    try {
      const ok = await patchItem(item, patch);
      if (ok) toast.success("Tarefa atualizada.");
      return ok;
    } finally {
      setBusy(false);
    }
  }

  async function runSuggestions(
    action: "accept" | "reject",
    targetItems: InboxActionItem[]
  ) {
    if (targetItems.length === 0) return;

    setBusy(true);
    try {
      const groups = groupByMeeting(targetItems);
      let total = 0;

      for (const [meetingId, group] of groups) {
        const res = await fetch(`/api/meetings/${meetingId}/action-items/suggestions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            ids: group.map((item) => item.id),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data?.error ?? "Falha ao processar sugestões.");
          return;
        }
        total +=
          action === "accept"
            ? ((data.items as unknown[])?.length ?? group.length)
            : ((data.removedIds as unknown[])?.length ?? group.length);
      }

      router.refresh();
      toast.success(
        action === "accept"
          ? total === 1
            ? "Sugestão aceita."
            : `${total} sugestões aceitas.`
          : total === 1
            ? "Sugestão descartada."
            : `${total} sugestões descartadas.`
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <TasksInboxFilters query={query} counts={counts} options={options} />

      {isSuggestedView && suggestedItems.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/25 bg-brand/5 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            <Sparkle size={16} className="mr-1.5 inline text-brand" aria-hidden />
            {suggestedItems.length} sugestão{suggestedItems.length === 1 ? "" : "ões"} da IA
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} onClick={() => void runSuggestions("accept", suggestedItems)}>
              Aceitar todas
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void runSuggestions("reject", suggestedItems)}
            >
              Descartar todas
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{INBOX_FILTER_LABELS[query.filter]}</CardTitle>
          <CardDescription>
            {isSuggestedView
              ? "Aceite ou descarte compromissos detectados na transcrição — sem abrir cada reunião."
              : "Marque como concluído ou edite inline. Clique no título para ver o contexto completo."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <CheckCircle size={32} className="text-emerald-500" aria-hidden />
              <p className="text-sm font-medium text-foreground">Nada por aqui</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                {isSuggestedView
                  ? "Quando a IA sugerir compromissos nas calls, eles aparecem nesta aba."
                  : "Nenhuma tarefa nesta visão. Tente outro filtro ou limpe os filtros avançados."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/70">
              {items.map((item) => (
                <TasksInboxItem
                  key={item.id}
                  item={item}
                  busy={busy}
                  onToggle={toggleItem}
                  onSave={saveItem}
                  onAcceptSuggestion={async (target) => {
                    await runSuggestions("accept", [target]);
                  }}
                  onRejectSuggestion={async (target) => {
                    await runSuggestions("reject", [target]);
                  }}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
