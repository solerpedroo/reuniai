"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CircleNotch } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  RELATIONSHIP_TYPES,
  type ParticipantRelationship,
} from "@/lib/participants/relationship-types";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type SaveState = "idle" | "saving" | "saved" | "error";

export function ParticipantRelationshipEditor({
  participantKey,
  initialRelationship,
}: {
  participantKey: string;
  initialRelationship: ParticipantRelationship | null;
}) {
  const [relationshipType, setRelationshipType] = useState(
    initialRelationship?.relationship_type ?? "colega"
  );
  const [talkingPoints, setTalkingPoints] = useState(
    (initialRelationship?.talking_points ?? []).join("\n")
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef({ relationshipType, talkingPoints });

  useEffect(() => {
    latestRef.current = { relationshipType, talkingPoints };
  }, [relationshipType, talkingPoints]);

  const save = useCallback(async () => {
    setSaveState("saving");
    const points = latestRef.current.talkingPoints
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    try {
      const res = await fetch(
        `/api/participants/${encodeURIComponent(participantKey)}/relationship`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            relationship_type: latestRef.current.relationshipType,
            talking_points: points,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao salvar");
      setSaveState("saved");
    } catch (err) {
      setSaveState("error");
      toast.error(err instanceof Error ? err.message : "Falha ao salvar");
    }
  }, [participantKey]);

  useEffect(() => {
    const initialType = initialRelationship?.relationship_type ?? "colega";
    const initialPoints = (initialRelationship?.talking_points ?? []).join("\n");
    if (relationshipType === initialType && talkingPoints === initialPoints) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void save();
    }, 800);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [relationshipType, talkingPoints, initialRelationship, save]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium">Relacionamento</label>
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

      <Select value={relationshipType} onValueChange={setRelationshipType}>
        <SelectTrigger>
          <SelectValue placeholder="Tipo de relacionamento" />
        </SelectTrigger>
        <SelectContent>
          {RELATIONSHIP_TYPES.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="space-y-2">
        <label htmlFor="talking-points" className="text-sm font-medium">
          Talking points
        </label>
        <Textarea
          id="talking-points"
          value={talkingPoints}
          onChange={(e) => {
            setSaveState("idle");
            setTalkingPoints(e.target.value);
          }}
          rows={4}
          placeholder="Um tópico por linha — assuntos para a próxima conversa"
        />
      </div>
    </div>
  );
}
