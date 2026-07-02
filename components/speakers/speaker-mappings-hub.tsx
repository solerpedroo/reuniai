"use client";

import { useCallback, useState } from "react";
import { Plus, Trash, UserSound } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { SpeakerMapping } from "@/lib/workflow/types";

export function SpeakerMappingsHub({ initialMappings }: { initialMappings: SpeakerMapping[] }) {
  const [mappings, setMappings] = useState(initialMappings);
  const [labelPattern, setLabelPattern] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [reapplying, setReapplying] = useState(false);

  const saveMapping = useCallback(async () => {
    if (!labelPattern.trim() || !displayName.trim()) {
      toast.error("Preencha o rótulo e o nome");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/speaker-mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label_pattern: labelPattern.trim(),
          display_name: displayName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao salvar");

      setMappings((prev) => {
        const filtered = prev.filter((m) => m.label_pattern !== data.mapping.label_pattern);
        return [...filtered, data.mapping].sort((a, b) =>
          a.label_pattern.localeCompare(b.label_pattern)
        );
      });
      setLabelPattern("");
      setDisplayName("");
      toast.success("Mapeamento salvo");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setBusy(false);
    }
  }, [labelPattern, displayName]);

  const removeMapping = useCallback(async (pattern: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/speaker-mappings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label_pattern: pattern }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao remover");
      setMappings((prev) => prev.filter((m) => m.label_pattern !== pattern));
      toast.success("Mapeamento removido");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao remover");
    } finally {
      setBusy(false);
    }
  }, []);

  const reapply = useCallback(async () => {
    setReapplying(true);
    try {
      const res = await fetch("/api/speaker-mappings/reapply", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao reaplicar");
      toast.success(
        `${data.segmentsUpdated} segmento${data.segmentsUpdated === 1 ? "" : "s"} atualizado${data.segmentsUpdated === 1 ? "" : "s"} em ${data.meetingsProcessed} reuniões`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao reaplicar");
    } finally {
      setReapplying(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      <Card className="surface-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserSound size={18} className="text-brand" />
            Novo mapeamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Associe rótulos genéricos da transcrição (ex. &ldquo;Speaker 1&rdquo;) ao nome real. Vale
            para reuniões futuras e pode ser reaplicado nas recentes.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Rótulo na transcrição (ex. Speaker 1)"
              value={labelPattern}
              onChange={(e) => setLabelPattern(e.target.value)}
            />
            <Input
              placeholder="Nome exibido (ex. João Silva)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <Button onClick={saveMapping} disabled={busy}>
            <Plus size={14} className="mr-1.5" />
            Adicionar mapeamento
          </Button>
        </CardContent>
      </Card>

      <Card className="surface-card">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Mapeamentos salvos</CardTitle>
          <Button variant="outline" size="sm" onClick={reapply} disabled={reapplying || mappings.length === 0}>
            {reapplying ? "Reaplicando…" : "Reaplicar em reuniões recentes"}
          </Button>
        </CardHeader>
        <CardContent>
          {mappings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum mapeamento global ainda. Crie um acima ou use o wizard pós-reunião.
            </p>
          ) : (
            <ul className="divide-y divide-border/70">
              {mappings.map((mapping) => (
                <li
                  key={mapping.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{mapping.display_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {mapping.label_pattern}
                      {mapping.participant_email ? ` · ${mapping.participant_email}` : ""}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeMapping(mapping.label_pattern)}
                    disabled={busy}
                    aria-label={`Remover mapeamento ${mapping.label_pattern}`}
                  >
                    <Trash size={16} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
