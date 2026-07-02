"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CircleNotch, NotePencil } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type SaveState = "idle" | "saving" | "saved" | "error";

export function MeetingPersonalNotesTab({
  meetingId,
  initialNotes,
}: {
  meetingId: string;
  initialNotes: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef(notes);

  useEffect(() => {
    latestRef.current = notes;
  }, [notes]);

  const save = useCallback(async () => {
    setSaveState("saving");
    try {
      const res = await fetch(`/api/meetings/${meetingId}/personal-notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personal_notes: latestRef.current }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao salvar");
      setSaveState("saved");
    } catch (err) {
      setSaveState("error");
      toast.error(err instanceof Error ? err.message : "Falha ao salvar notas");
    }
  }, [meetingId]);

  useEffect(() => {
    if (notes === initialNotes) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void save();
    }, 800);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [notes, initialNotes, save]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <NotePencil size={16} className="text-brand" />
            Minhas notas
          </h3>
          <p className="text-sm text-muted-foreground">
            Anotações pessoais — separadas do resumo gerado por IA e não incluídas no chat por
            padrão.
          </p>
          {initialNotes.trim() && (
            <Link
              href="/notas"
              className="mt-1 inline-block text-xs text-muted-foreground hover:text-brand"
            >
              Ver todas as notas
            </Link>
          )}
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs",
            saveState === "saved" && "text-emerald-600",
            saveState === "error" && "text-destructive",
            saveState === "saving" && "text-muted-foreground"
          )}
        >
          {saveState === "saving" && (
            <>
              <CircleNotch size={12} className="animate-spin" />
              Salvando…
            </>
          )}
          {saveState === "saved" && (
            <>
              <Check size={12} />
              Salvo
            </>
          )}
        </span>
      </div>

      <div className="surface-card border-dashed p-4">
        <Textarea
          value={notes}
          onChange={(e) => {
            setSaveState("idle");
            setNotes(e.target.value);
          }}
          rows={14}
          placeholder="Decisões pessoais, follow-ups, contexto que a IA não capturou…"
          className="border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
        />
      </div>
    </div>
  );
}
