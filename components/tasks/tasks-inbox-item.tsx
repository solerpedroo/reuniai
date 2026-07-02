"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle,
  Circle,
  PencilSimple,
  Sparkle,
  User,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { InboxActionItem } from "@/lib/meetings/action-items-inbox";
import { formatDueDate } from "@/lib/meetings/types";
import { cn } from "@/lib/utils";

type TasksInboxItemProps = {
  item: InboxActionItem;
  onToggle: (item: InboxActionItem) => Promise<void>;
  onSave: (item: InboxActionItem, patch: { title?: string; assignee?: string | null; due_date?: string | null }) => Promise<boolean>;
  onAcceptSuggestion?: (item: InboxActionItem) => Promise<void>;
  onRejectSuggestion?: (item: InboxActionItem) => Promise<void>;
  busy?: boolean;
};

export function TasksInboxItem({
  item,
  onToggle,
  onSave,
  onAcceptSuggestion,
  onRejectSuggestion,
  busy = false,
}: TasksInboxItemProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [assignee, setAssignee] = useState(item.assignee ?? "");
  const [dueDate, setDueDate] = useState(item.due_date ?? "");

  const due = item.due_date ? formatDueDate(item.due_date) : null;
  const isSuggested = item.status === "suggested";

  async function handleSave() {
    const ok = await onSave(item, {
      title: title.trim(),
      assignee: assignee.trim() || null,
      due_date: dueDate.trim() || null,
    });
    if (ok) setEditing(false);
  }

  function cancelEdit() {
    setTitle(item.title);
    setAssignee(item.assignee ?? "");
    setDueDate(item.due_date ?? "");
    setEditing(false);
  }

  return (
    <li className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
      {isSuggested ? (
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Sparkle size={16} weight="fill" aria-hidden />
        </span>
      ) : (
        <button
          type="button"
          onClick={() => void onToggle(item)}
          disabled={busy || editing}
          className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-brand disabled:opacity-50"
          aria-label={item.status === "done" ? "Reabrir item" : "Marcar como concluído"}
        >
          {item.status === "done" ? (
            <CheckCircle size={22} weight="fill" className="text-brand" />
          ) : (
            <Circle size={22} />
          )}
        </button>
      )}

      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="space-y-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da tarefa"
              className="h-9"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="Responsável"
                className="h-9"
              />
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void handleSave()} disabled={busy || !title.trim()}>
                <Check size={14} />
                Salvar
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={busy}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-2">
              <Link
                href={`/reunioes/${item.meeting_id}`}
                className="block min-w-0 flex-1 text-sm font-medium leading-snug text-foreground hover:text-brand hover:underline"
              >
                {item.title}
              </Link>
              {!isSuggested && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Editar tarefa"
                >
                  <PencilSimple size={14} />
                </button>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <Link
                href={`/reunioes/${item.meeting_id}`}
                className="truncate hover:text-foreground hover:underline"
              >
                {item.meeting_title}
              </Link>
              {item.assignee && (
                <span className="inline-flex items-center gap-1">
                  <User size={12} aria-hidden />
                  {item.assignee}
                </span>
              )}
              {due && (
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 font-medium",
                    due.overdue
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {due.label}
                </span>
              )}
              {isSuggested && (
                <span className="rounded-md bg-brand/10 px-1.5 py-0.5 font-medium text-brand">
                  Sugestão IA
                </span>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
        {isSuggested ? (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void onRejectSuggestion?.(item)}
            >
              Descartar
            </Button>
            <Button size="sm" disabled={busy} onClick={() => void onAcceptSuggestion?.(item)}>
              Aceitar
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/reunioes/${item.meeting_id}`}>
              Abrir
              <ArrowRight size={14} />
            </Link>
          </Button>
        )}
      </div>
    </li>
  );
}
