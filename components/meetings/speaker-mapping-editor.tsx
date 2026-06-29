"use client";

import { useCallback, useMemo, useState } from "react";
import { UserSound } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TranscriptSegment } from "@/lib/supabase/types";
import type { SpeakerMapping } from "@/lib/workflow/types";

export function SpeakerMappingEditor({
  meetingId,
  segments,
  initialMappings,
}: {
  meetingId: string;
  segments: TranscriptSegment[];
  initialMappings: SpeakerMapping[];
}) {
  const speakers = useMemo(
    () => [...new Set(segments.map((s) => s.speaker_label))].sort(),
    [segments]
  );

  const mappingByLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of initialMappings) {
      map.set(m.label_pattern.toLowerCase(), m.display_name);
    }
    return map;
  }, [initialMappings]);

  const [names, setNames] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const speaker of speakers) {
      initial[speaker] = mappingByLabel.get(speaker.toLowerCase()) ?? speaker;
    }
    return initial;
  });
  const [busy, setBusy] = useState(false);

  const save = useCallback(async () => {
    setBusy(true);
    try {
      const mappings = speakers
        .filter((speaker) => names[speaker]?.trim() && names[speaker] !== speaker)
        .map((speaker) => ({
          label_pattern: speaker,
          display_name: names[speaker]!.trim(),
        }));

      const res = await fetch(`/api/meetings/${meetingId}/speaker-mappings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappings }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Falha ao salvar mapeamento");
        return;
      }
      toast.success(
        data.segmentsUpdated > 0
          ? `Mapeamento salvo (${data.segmentsUpdated} segmentos atualizados)`
          : "Mapeamento salvo para reuniões futuras"
      );
      if (data.segmentsUpdated > 0) window.location.reload();
    } finally {
      setBusy(false);
    }
  }, [meetingId, names, speakers]);

  if (speakers.length === 0) return null;

  return (
    <div className="rounded-lg border border-border/70 p-4 space-y-3">
      <p className="text-sm font-medium flex items-center gap-1.5">
        <UserSound size={16} className="text-brand" />
        Identificar participantes
      </p>
      <p className="text-xs text-muted-foreground">
        Renomeie os speakers detectados. O mapeamento persiste em reuniões futuras.
      </p>
      <ul className="space-y-2">
        {speakers.map((speaker) => (
          <li key={speaker} className="flex items-center gap-2 text-sm">
            <span className="w-28 shrink-0 truncate text-muted-foreground">{speaker}</span>
            <span className="text-muted-foreground">→</span>
            <Input
              value={names[speaker] ?? speaker}
              onChange={(e) => setNames((prev) => ({ ...prev, [speaker]: e.target.value }))}
              className="h-8"
            />
          </li>
        ))}
      </ul>
      <Button size="sm" disabled={busy} onClick={() => void save()}>
        Salvar nomes
      </Button>
    </div>
  );
}
