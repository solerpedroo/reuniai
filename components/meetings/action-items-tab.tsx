"use client";

import { useMemo, useState } from "react";
import { CheckCircle, Circle, PencilSimple, Plus, Sparkle, Trash, User, X } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionItem } from "@/lib/supabase/types";

function formatDueDate(date: string | null): string | null {
  if (!date) return null;
  try {
    return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return date;
  }
}

export function ActionItemsTab({
  meetingId,
  initialItems,
}: {
  meetingId: string;
  initialItems: ActionItem[];
}) {
  const [items, setItems] = useState<ActionItem[]>(initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  const suggestedItems = useMemo(
    () => items.filter((item) => item.status === "suggested"),
    [items]
  );
  const activeItems = useMemo(
    () => items.filter((item) => item.status !== "suggested"),
    [items]
  );

  const base = `/api/meetings/${meetingId}/action-items`;
  const suggestionsUrl = `${base}/suggestions`;

  async function handleSuggestions(action: "accept" | "reject", ids?: string[]) {
    const targetIds = ids ?? suggestedItems.map((item) => item.id);
    if (targetIds.length === 0) return;

    setBusy(true);
    try {
      const res = await fetch(suggestionsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids: targetIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Falha ao processar sugestões.");
        return;
      }

      if (action === "accept") {
        const accepted = (data.items ?? []) as ActionItem[];
        setItems((prev) =>
          prev.map((item) => {
            const updated = accepted.find((a) => a.id === item.id);
            return updated ?? item;
          })
        );
        toast.success(
          accepted.length === 1 ? "Sugestão aceita." : `${accepted.length} sugestões aceitas.`
        );
      } else {
        const removed = (data.removedIds ?? targetIds) as string[];
        setItems((prev) => prev.filter((item) => !removed.includes(item.id)));
        toast.success(
          removed.length === 1 ? "Sugestão descartada." : `${removed.length} sugestões descartadas.`
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggle(item: ActionItem) {
    const next = item.status === "done" ? "open" : "done";
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: next } : i)));
    const res = await fetch(`${base}/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
      toast.error("Não foi possível atualizar o item.");
    }
  }

  async function saveEdit(item: ActionItem, patch: Partial<ActionItem>) {
    setBusy(true);
    try {
      const res = await fetch(`${base}/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Falha ao salvar.");
        return;
      }
      setItems((prev) => prev.map((i) => (i.id === item.id ? data.item : i)));
      setEditingId(null);
      toast.success("Item atualizado.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: ActionItem) {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    const res = await fetch(`${base}/${item.id}`, { method: "DELETE" });
    if (!res.ok) {
      setItems((prev) => [...prev, item].sort((a, b) => a.created_at.localeCompare(b.created_at)));
      toast.error("Falha ao remover item.");
    }
  }

  async function create(values: { title: string; assignee: string; due_date: string }) {
    setBusy(true);
    try {
      const res = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: values.title,
          assignee: values.assignee || null,
          due_date: values.due_date || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Falha ao criar item.");
        return;
      }
      setItems((prev) => [...prev, data.item]);
      setAdding(false);
      toast.success("Item adicionado.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {suggestedItems.length > 0 && (
        <div className="rounded-lg border border-brand/30 bg-brand/5 p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Sparkle size={16} className="text-brand" />
                Sugestões da IA
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Compromissos temporais detectados na transcrição
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={busy}
                onClick={() => void handleSuggestions("accept")}
              >
                Aceitar todas
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void handleSuggestions("reject")}
              >
                Descartar todas
              </Button>
            </div>
          </div>
          <ul className="space-y-2">
            {suggestedItems.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-md border border-border/60 bg-background p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{item.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {item.assignee && (
                      <span className="inline-flex items-center gap-1">
                        <User size={12} />
                        {item.assignee}
                      </span>
                    )}
                    {formatDueDate(item.due_date) && (
                      <span>Prazo: {formatDueDate(item.due_date)}</span>
                    )}
                    <span className="rounded bg-brand/10 px-1.5 py-0.5 text-brand">
                      Sugerido pela IA
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void handleSuggestions("accept", [item.id])}
                  >
                    Aceitar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground"
                    disabled={busy}
                    onClick={() => void handleSuggestions("reject", [item.id])}
                  >
                    Descartar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {activeItems.length} {activeItems.length === 1 ? "item" : "itens"}
        </p>
        <Button size="sm" variant="outline" onClick={() => setAdding((v) => !v)}>
          <Plus size={14} />
          Adicionar
        </Button>
      </div>

      {adding && <AddItemForm busy={busy} onCancel={() => setAdding(false)} onSubmit={create} />}

      {activeItems.length === 0 && !adding ? (
        <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          Nenhum item de ação. Adicione um ou processe a reunião com IA.
        </p>
      ) : (
        <ul className="space-y-2">
          {activeItems.map((item) =>
            editingId === item.id ? (
              <li key={item.id} className="rounded-lg border border-border p-4">
                <EditItemForm item={item} busy={busy} onCancel={() => setEditingId(null)} onSave={saveEdit} />
              </li>
            ) : (
              <li key={item.id} className="flex items-start gap-3 rounded-lg border border-border p-4">
                <button
                  type="button"
                  onClick={() => toggle(item)}
                  className="mt-0.5 shrink-0 transition-transform active:scale-90"
                  aria-label={item.status === "done" ? "Reabrir" : "Concluir"}
                >
                  {item.status === "done" ? (
                    <CheckCircle size={18} weight="fill" className="text-brand" />
                  ) : (
                    <Circle size={18} className="text-muted-foreground" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm ${
                      item.status === "done" ? "text-muted-foreground line-through" : "text-foreground"
                    }`}
                  >
                    {item.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {item.assignee && (
                      <span className="inline-flex items-center gap-1">
                        <User size={12} />
                        {item.assignee}
                      </span>
                    )}
                    {formatDueDate(item.due_date) && <span>Prazo: {formatDueDate(item.due_date)}</span>}
                    {item.source === "ai" && item.status !== "suggested" && (
                      <span className="rounded bg-brand/10 px-1.5 py-0.5 text-brand">IA</span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="icon" variant="ghost" className="size-8" onClick={() => setEditingId(item.id)}>
                    <PencilSimple size={14} />
                  </Button>
                  <Button size="icon" variant="ghost" className="size-8 text-destructive" onClick={() => remove(item)}>
                    <Trash size={14} />
                  </Button>
                </div>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}

function AddItemForm({
  busy,
  onCancel,
  onSubmit,
}: {
  busy: boolean;
  onCancel: () => void;
  onSubmit: (values: { title: string; assignee: string; due_date: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onSubmit({ title: title.trim(), assignee, due_date: dueDate });
      }}
      className="space-y-3 rounded-lg border border-border p-4"
    >
      <Input placeholder="Descrição da tarefa" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input placeholder="Responsável (opcional)" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="sm:w-44" />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          <X size={14} />
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={busy || !title.trim()}>
          Salvar
        </Button>
      </div>
    </form>
  );
}

function EditItemForm({
  item,
  busy,
  onCancel,
  onSave,
}: {
  item: ActionItem;
  busy: boolean;
  onCancel: () => void;
  onSave: (item: ActionItem, patch: Partial<ActionItem>) => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [assignee, setAssignee] = useState(item.assignee ?? "");
  const [dueDate, setDueDate] = useState(item.due_date ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onSave(item, {
          title: title.trim(),
          assignee: assignee.trim() || null,
          due_date: dueDate || null,
        });
      }}
      className="space-y-3"
    >
      <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input placeholder="Responsável" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="sm:w-44" />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={busy || !title.trim()}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
