"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CircleNotch } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type SaveState = "idle" | "saving" | "saved" | "error";

export function ParticipantNotesEditor({
  participantKey,
  initialBody,
}: {
  participantKey: string;
  initialBody: string;
}) {
  const [body, setBody] = useState(initialBody);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestBodyRef = useRef(body);

  useEffect(() => {
    latestBodyRef.current = body;
  }, [body]);

  const save = useCallback(async () => {
    setSaveState("saving");
    try {
      const res = await fetch(`/api/participants/${encodeURIComponent(participantKey)}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: latestBodyRef.current }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao salvar");
      setSaveState("saved");
    } catch (err) {
      setSaveState("error");
      toast.error(err instanceof Error ? err.message : "Falha ao salvar nota");
    }
  }, [participantKey]);

  useEffect(() => {
    if (body === initialBody) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void save();
    }, 800);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [body, initialBody, save]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="participant-notes" className="text-sm font-medium">
          Notas privadas
        </label>
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
          {saveState === "error" && "Erro ao salvar"}
        </span>
      </div>
      <Textarea
        id="participant-notes"
        value={body}
        onChange={(e) => {
          setSaveState("idle");
          setBody(e.target.value);
        }}
        rows={8}
        placeholder="Contexto sobre essa pessoa, preferências, histórico relevante…"
        className="resize-y"
      />
      <p className="text-xs text-muted-foreground">
        Visível apenas para você. Aparece no prep e na agenda de calls futuras.
      </p>
    </div>
  );
}
