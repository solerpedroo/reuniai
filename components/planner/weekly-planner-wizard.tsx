"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { WeeklyPlannerData } from "@/lib/planner/weekly-planner";
import { formatMeetingDate } from "@/lib/meetings/types";

const STEPS = [
  { id: 1, title: "Revisão pendente", description: "Reuniões que ainda precisam de fechamento." },
  { id: 2, title: "Tarefas prioritárias", description: "Focus e atrasos da inbox." },
  { id: 3, title: "Agenda da semana", description: "Reuniões agendadas neste período." },
  { id: 4, title: "Intenção da semana", description: "O que você quer priorizar?" },
] as const;

export function WeeklyPlannerWizard({ data }: { data: WeeklyPlannerData }) {
  const [step, setStep] = useState(1);
  const [intention, setIntention] = useState(data.intention);
  const [saving, setSaving] = useState(false);

  const saveIntention = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/planner/intention", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekKey: data.weekKey, intention }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Falha ao salvar");
      toast.success("Intenção salva");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }, [data.weekKey, intention]);

  const current = STEPS[step - 1]!;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStep(s.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              step === s.id ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {s.id}. {s.title}
          </button>
        ))}
      </div>

      <div className="surface-card p-6">
        <h2 className="text-lg font-semibold">{current.title}</h2>
        <p className="mb-4 text-sm text-muted-foreground">{current.description}</p>

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm">
              <span className="font-semibold tabular-nums">{data.reviewPending}</span> reuniões na fila de
              revisão.
            </p>
            {data.reviewItems.length > 0 ? (
              <ul className="space-y-2">
                {data.reviewItems.map((m) => (
                  <li key={m.id}>
                    <Link href={`/reunioes/${m.id}?revisar=1`} className="text-sm text-brand hover:underline">
                      {m.title}
                    </Link>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {formatMeetingDate(m.started_at)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nada pendente — ótimo!</p>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/revisar">Abrir fila de revisão</Link>
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex gap-4 text-sm">
              <span>
                <strong>{data.inboxFocus}</strong> em focus
              </span>
              <span className="text-destructive">
                <strong>{data.inboxOverdue}</strong> atrasadas
              </span>
            </div>
            {data.topTasks.length > 0 ? (
              <ul className="space-y-2">
                {data.topTasks.map((task) => (
                  <li key={task.id} className="text-sm">
                    {task.title}
                    {task.due_date && (
                      <span className="ml-2 text-xs text-muted-foreground">· {task.due_date}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Inbox limpa.</p>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/tarefas">Abrir inbox</Link>
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            {data.upcomingMeetings.length > 0 ? (
              <ul className="space-y-2">
                {data.upcomingMeetings.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link href={`/reunioes/${m.id}`} className="text-brand hover:underline">
                      {m.title}
                    </Link>
                    <span className="text-xs text-muted-foreground">{formatMeetingDate(m.started_at)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma reunião nesta semana.</p>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/agenda">Ver agenda do dia</Link>
            </Button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <Textarea
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              rows={5}
              placeholder="Ex.: Fechar 3 revisões pendentes, preparar pitch com cliente X, reduzir reuniões internas…"
            />
            <Button variant="brand" size="sm" disabled={saving} onClick={() => void saveIntention()}>
              {saving ? "Salvando…" : "Salvar intenção"}
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          disabled={step <= 1}
          onClick={() => setStep((s) => Math.max(1, s - 1))}
        >
          <ArrowLeft size={16} className="mr-1" />
          Anterior
        </Button>
        {step < 4 ? (
          <Button variant="brand" size="sm" onClick={() => setStep((s) => Math.min(4, s + 1))}>
            Próximo
            <ArrowRight size={16} className="ml-1" />
          </Button>
        ) : (
          <Button variant="brand" size="sm" onClick={() => void saveIntention()}>
            <Check size={16} className="mr-1" />
            Concluir
          </Button>
        )}
      </div>
    </div>
  );
}
