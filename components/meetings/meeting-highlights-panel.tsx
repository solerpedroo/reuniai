"use client";

import { useCallback, useState } from "react";
import { BookmarkSimple, LinkSimple, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatTimestamp } from "@/lib/meetings/transcript";
import type { MeetingHighlight } from "@/lib/workflow/types";

export function MeetingHighlightsPanel({
  meetingId,
  initialHighlights,
  currentTimeMs,
  onSeek,
}: {
  meetingId: string;
  initialHighlights: MeetingHighlight[];
  currentTimeMs: number;
  onSeek: (ms: number) => void;
}) {
  const [highlights, setHighlights] = useState(initialHighlights);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  const base = `/api/meetings/${meetingId}/highlights`;

  const addHighlight = useCallback(async () => {
    if (!label.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), start_ms: Math.round(currentTimeMs) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Falha ao marcar momento");
        return;
      }
      setHighlights((prev) =>
        [...prev, data.highlight as MeetingHighlight].sort((a, b) => a.start_ms - b.start_ms)
      );
      setLabel("");
      toast.success("Momento marcado");
    } finally {
      setBusy(false);
    }
  }, [base, currentTimeMs, label]);

  const shareClip = useCallback(
    async (highlightId: string) => {
      setBusy(true);
      try {
        const res = await fetch(`${base}/${highlightId}/clip`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ redact_pii: true }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data?.error ?? "Falha ao criar clip");
          return;
        }
        if (data.url) {
          await navigator.clipboard.writeText(String(data.url));
          toast.success("Link do clip copiado");
        }
      } finally {
        setBusy(false);
      }
    },
    [base]
  );

  const removeHighlight = useCallback(
    async (highlightId: string) => {
      setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
      const res = await fetch(`${base}/${highlightId}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Falha ao remover");
        const reload = await fetch(base).then((r) => r.json());
        setHighlights(reload.highlights ?? []);
      }
    },
    [base]
  );

  return (
    <div className="rounded-lg border border-border/70 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium flex items-center gap-1.5">
          <BookmarkSimple size={16} className="text-brand" />
          Momentos marcados
        </p>
        <span className="text-xs text-muted-foreground font-mono">
          {formatTimestamp(Math.round(currentTimeMs))}
        </span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Descrição do momento..."
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void addHighlight();
          }}
        />
        <Button size="sm" disabled={busy || !label.trim()} onClick={() => void addHighlight()}>
          Marcar momento
        </Button>
      </div>

      {highlights.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Marque trechos importantes durante a revisão. Incluídos no export.
        </p>
      ) : (
        <ul className="space-y-2">
          {highlights.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-2 rounded-md border border-border/60 px-3 py-2 text-sm"
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left hover:text-brand"
                onClick={() => onSeek(item.start_ms)}
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {formatTimestamp(item.start_ms)}
                </span>
                <p className="mt-0.5">{item.label}</p>
              </button>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 shrink-0"
                title="Compartilhar clip"
                disabled={busy}
                onClick={() => void shareClip(item.id)}
              >
                <LinkSimple size={14} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 shrink-0"
                onClick={() => void removeHighlight(item.id)}
              >
                <Trash size={14} />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
