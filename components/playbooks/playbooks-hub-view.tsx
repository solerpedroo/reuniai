"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lightning, Plus, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { Playbook, PlaybookRun } from "@/lib/playbooks/types";
import { cn } from "@/lib/utils";

export function PlaybooksHubView({
  playbooks: initialPlaybooks,
  recentRuns,
}: {
  playbooks: Playbook[];
  recentRuns: (PlaybookRun & { playbook_name: string; meeting_title: string })[];
}) {
  const router = useRouter();
  const [playbooks, setPlaybooks] = useState(initialPlaybooks);
  const [name, setName] = useState("");
  const [titleContains, setTitleContains] = useState("");
  const [busy, setBusy] = useState(false);

  async function createPlaybook() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/playbooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          conditions: titleContains.trim() ? { title_contains: titleContains.trim() } : {},
          actions: [{ type: "generate_follow_up" }],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Falha ao criar playbook");
        return;
      }
      setPlaybooks((prev) => [data.playbook as Playbook, ...prev]);
      setName("");
      setTitleContains("");
      toast.success("Playbook criado");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function toggleEnabled(playbook: Playbook) {
    const res = await fetch(`/api/playbooks/${playbook.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !playbook.enabled }),
    });
    if (!res.ok) {
      toast.error("Falha ao atualizar playbook");
      return;
    }
    setPlaybooks((prev) =>
      prev.map((p) => (p.id === playbook.id ? { ...p, enabled: !p.enabled } : p))
    );
  }

  async function removePlaybook(id: string) {
    const res = await fetch(`/api/playbooks/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Falha ao excluir");
      return;
    }
    setPlaybooks((prev) => prev.filter((p) => p.id !== id));
    toast.success("Playbook removido");
  }

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-border/70 p-4 space-y-3">
        <p className="text-sm font-medium flex items-center gap-1.5">
          <Plus size={16} className="text-brand" />
          Novo playbook
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            placeholder="Nome (ex.: 1:1 follow-up)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="Título contém (opcional)"
            value={titleContains}
            onChange={(e) => setTitleContains(e.target.value)}
          />
        </div>
        <Button size="sm" disabled={busy || !name.trim()} onClick={() => void createPlaybook()}>
          Criar playbook
        </Button>
        <p className="text-xs text-muted-foreground">
          Playbooks rodam automaticamente após o processamento da reunião quando as condições
          batem.
        </p>
      </div>

      {playbooks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum playbook ainda. Crie regras para automatizar follow-up, tags e pastas.
        </p>
      ) : (
        <ul className="space-y-3">
          {playbooks.map((playbook) => (
            <li
              key={playbook.id}
              className="rounded-lg border border-border/70 p-4 flex flex-wrap items-start justify-between gap-3"
            >
              <div className="min-w-0 space-y-1">
                <p className="font-medium flex items-center gap-1.5">
                  <Lightning size={16} className="text-brand" />
                  {playbook.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {playbook.conditions.title_contains
                    ? `Título contém “${playbook.conditions.title_contains}”`
                    : "Sem filtro de título"}
                  {" · "}
                  {playbook.actions.length} ação(ões)
                </p>
                <p className="text-xs text-muted-foreground">
                  {playbook.actions.map((a) => a.type).join(", ") || "—"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={playbook.enabled} onCheckedChange={() => void toggleEnabled(playbook)} />
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  onClick={() => void removePlaybook(playbook.id)}
                >
                  <Trash size={14} />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {recentRuns.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Execuções recentes</p>
          <ul className="space-y-2">
            {recentRuns.map((run) => (
              <li
                key={run.id}
                className="rounded-md border border-border/60 px-3 py-2 text-sm flex flex-wrap justify-between gap-2"
              >
                <span>
                  <span className="font-medium">{run.playbook_name}</span>
                  <span className="text-muted-foreground"> → {run.meeting_title}</span>
                </span>
                <span
                  className={cn(
                    "text-xs rounded-full px-2 py-0.5",
                    run.status === "success"
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      : run.status === "failed"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                  )}
                >
                  {run.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
