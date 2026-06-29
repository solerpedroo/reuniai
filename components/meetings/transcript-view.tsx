"use client";

import { useEffect, useMemo, useState } from "react";
import { ChatText, MagnifyingGlass, X } from "@phosphor-icons/react";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { formatTimestamp } from "@/lib/meetings/transcript";
import type { TranscriptSegment } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const SPEAKER_TONES = [
  "bg-brand/12 text-brand ring-brand/20",
  "bg-primary/10 text-primary ring-primary/20",
  "bg-accent text-accent-foreground ring-border/40",
  "bg-secondary text-secondary-foreground ring-border/40",
  "bg-muted text-foreground/80 ring-border/30",
  "bg-brand/8 text-primary ring-brand/15",
];

function toneForSpeaker(speaker: string, index: Map<string, number>): string {
  if (!index.has(speaker)) index.set(speaker, index.size);
  return SPEAKER_TONES[(index.get(speaker) ?? 0) % SPEAKER_TONES.length];
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const pattern = new RegExp(`(${escapeRegex(query.trim())})`, "gi");
  const parts = text.split(pattern);

  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="rounded-sm bg-brand/20 px-0.5 text-foreground">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function TranscriptView({
  segments,
  highlightMs,
  onHighlightDone,
}: {
  segments: TranscriptSegment[];
  highlightMs?: number | null;
  onHighlightDone?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);

  const speakers = useMemo(
    () => [...new Set(segments.map((s) => s.speaker_label))],
    [segments]
  );

  const speakerIndex = useMemo(() => new Map<string, number>(), []);

  useEffect(() => {
    if (highlightMs == null) return;

    const el = document.getElementById(`segment-${highlightMs}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });

    const timer = window.setTimeout(() => onHighlightDone?.(), 3200);
    return () => window.clearTimeout(timer);
  }, [highlightMs, onHighlightDone]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return segments.filter((segment) => {
      if (activeSpeaker && segment.speaker_label !== activeSpeaker) return false;
      if (!term) return true;
      return (
        segment.text.toLowerCase().includes(term) ||
        segment.speaker_label.toLowerCase().includes(term)
      );
    });
  }, [segments, query, activeSpeaker]);

  if (segments.length === 0) {
    return (
      <EmptyState
        icon={ChatText}
        tone="muted"
        title="Transcrição pendente"
        description="Quando o bot finalizar a gravação e o processamento, cada fala aparecerá aqui com timestamp e participante."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="surface-toolbar sticky top-14 z-10 space-y-3 p-3">
        <div className="relative">
          <MagnifyingGlass
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar na transcrição…"
            className="h-9 pl-9 pr-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {speakers.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveSpeaker(null)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                activeSpeaker === null
                  ? "border-brand/30 bg-brand/10 text-brand"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              Todos
            </button>
            {speakers.map((speaker) => (
              <button
                key={speaker}
                type="button"
                onClick={() =>
                  setActiveSpeaker((current) => (current === speaker ? null : speaker))
                }
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  activeSpeaker === speaker
                    ? toneForSpeaker(speaker, speakerIndex) + " ring-1"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {speaker}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={MagnifyingGlass}
          tone="default"
          title="Nenhum trecho encontrado"
          description="Tente outro termo ou limpe os filtros de participante."
        />
      ) : (
        <div className="space-y-5">
          {filtered.map((segment) => {
            const speakerTone = toneForSpeaker(segment.speaker_label, speakerIndex);
            const isSpeakerActive =
              !activeSpeaker || activeSpeaker === segment.speaker_label;

            return (
              <div
                key={segment.id}
                id={`segment-${segment.start_ms}`}
                className={cn(
                  "flex gap-3 rounded-lg px-2 py-1 transition-colors",
                  isSpeakerActive && activeSpeaker && "bg-brand/5",
                  query.trim() && "hover:bg-muted/30",
                  highlightMs === segment.start_ms &&
                    "bg-brand/10 ring-2 ring-brand/30 ring-offset-2 ring-offset-background"
                )}
              >
                <span className="sticky top-28 w-12 shrink-0 self-start pt-0.5 text-right font-mono text-xs tabular-nums text-muted-foreground">
                  {formatTimestamp(segment.start_ms)}
                </span>
                <div className="min-w-0 flex-1 border-l border-border/50 pl-3">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveSpeaker((current) =>
                        current === segment.speaker_label ? null : segment.speaker_label
                      )
                    }
                    className={cn(
                      "inline-block rounded-md px-2 py-0.5 text-xs font-medium ring-1 transition-transform hover:scale-[1.02]",
                      speakerTone
                    )}
                  >
                    {segment.speaker_label}
                  </button>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground">
                    {highlightText(segment.text, query)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? "trecho" : "trechos"}
        {query.trim() || activeSpeaker ? ` de ${segments.length}` : ""}
      </p>
    </div>
  );
}
