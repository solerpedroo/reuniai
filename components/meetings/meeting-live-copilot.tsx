"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookmarkSimple,
  Gavel,
  ListChecks,
  Microphone,
  Trash,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatTimestamp } from "@/lib/meetings/transcript";
import { deriveBotUiPhase } from "@/lib/meetings/bot-lifecycle";
import { getLiveElapsedMs, isLiveMeetingStatus } from "@/lib/meetings/live-elapsed";
import type { Meeting } from "@/lib/supabase/types";
import type { MeetingSessionResponse } from "@/lib/meetings/use-meeting-session";
import { cn } from "@/lib/utils";

type LiveTranscriptSegment = {
  speaker: string;
  text: string;
  start_ms: number | null;
};

type LiveDecision = {
  id: string;
  text: string;
  captured_at_ms: number;
};

type CaptureMode = "decision" | "action" | "highlight" | null;

const POLL_MS = 5_000;

export function MeetingLiveCopilot({
  meeting,
  session,
}: {
  meeting: Meeting;
  session?: MeetingSessionResponse | null;
}) {
  const [segments, setSegments] = useState<LiveTranscriptSegment[]>([]);
  const [elapsedMs, setElapsedMs] = useState(() => getLiveElapsedMs(meeting.started_at));
  const [decisions, setDecisions] = useState<LiveDecision[]>([]);
  const [captureMode, setCaptureMode] = useState<CaptureMode>(null);
  const [captureText, setCaptureText] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const live = isLiveMeetingStatus(meeting.status);
  const base = `/api/meetings/${meeting.id}`;

  useEffect(() => {
    if (!live) return;
    const tick = () => setElapsedMs(getLiveElapsedMs(meeting.started_at));
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [live, meeting.started_at]);

  useEffect(() => {
    if (!live) return;

    let cancelled = false;

    async function pollTranscript() {
      try {
        const res = await fetch(`${base}/live-transcript`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { segments?: LiveTranscriptSegment[] };
        if (!cancelled) setSegments(data.segments ?? []);
      } catch {
        // silencioso — próximo poll
      }
    }

    async function loadDecisions() {
      try {
        const res = await fetch(`${base}/live-decisions`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { decisions?: LiveDecision[] };
        if (!cancelled) setDecisions(data.decisions ?? []);
      } catch {
        // silencioso
      }
    }

    void pollTranscript();
    void loadDecisions();
    const interval = window.setInterval(() => {
      void pollTranscript();
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [base, live]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [segments.length]);

  const openCapture = useCallback((mode: CaptureMode) => {
    setCaptureMode(mode);
    setCaptureText("");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const submitCapture = useCallback(async () => {
    if (!captureMode || !captureText.trim()) return;
    setBusy(true);
    try {
      const body = { text: captureText.trim(), captured_at_ms: Math.round(elapsedMs) };

      if (captureMode === "decision") {
        const res = await fetch(`${base}/live-decisions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data?.error ?? "Falha ao registrar decisão");
          return;
        }
        setDecisions((prev) =>
          [...prev, data.decision as LiveDecision].sort(
            (a, b) => a.captured_at_ms - b.captured_at_ms
          )
        );
        toast.success("Decisão registrada");
      }

      if (captureMode === "action") {
        const res = await fetch(`${base}/action-items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: body.text, source: "live" }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data?.error ?? "Falha ao criar atribuição");
          return;
        }
        toast.success("Atribuição criada");
      }

      if (captureMode === "highlight") {
        const res = await fetch(`${base}/highlights`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: body.text, start_ms: body.captured_at_ms }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data?.error ?? "Falha ao marcar momento");
          return;
        }
        toast.success("Momento marcado");
      }

      setCaptureMode(null);
      setCaptureText("");
    } finally {
      setBusy(false);
    }
  }, [base, captureMode, captureText, elapsedMs]);

  const removeDecision = useCallback(
    async (id: string) => {
      setDecisions((prev) => prev.filter((d) => d.id !== id));
      const res = await fetch(`${base}/live-decisions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        toast.error("Falha ao remover decisão");
        const reload = await fetch(`${base}/live-decisions`).then((r) => r.json());
        setDecisions(reload.decisions ?? []);
      }
    },
    [base]
  );

  useEffect(() => {
    if (!live) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "d") {
        event.preventDefault();
        openCapture("decision");
      } else if (key === "a") {
        event.preventDefault();
        openCapture("action");
      } else if (key === "h") {
        event.preventDefault();
        openCapture("highlight");
      } else if (key === "escape") {
        setCaptureMode(null);
        setCaptureText("");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [live, openCapture]);

  if (!live) return null;

  const phase = deriveBotUiPhase(meeting.status, session?.session ?? null);
  const transcriptionActive =
    phase === "recording" &&
    (session?.session?.transcription.active ?? segments.length > 0);

  return (
    <div className="surface-toolbar space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Microphone
            size={18}
            className={cn(transcriptionActive ? "text-brand status-pulse" : "text-muted-foreground")}
          />
          <div>
            <p className="text-sm font-medium">Copiloto ao vivo</p>
            <p className="text-xs text-muted-foreground">
              Atalhos: <kbd className="font-mono">D</kbd> decisão ·{" "}
              <kbd className="font-mono">A</kbd> atribuição · <kbd className="font-mono">H</kbd>{" "}
              momento
            </p>
          </div>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {formatTimestamp(Math.round(elapsedMs))}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => openCapture("decision")}>
          <Gavel size={14} className="mr-1" />
          Decisão
        </Button>
        <Button size="sm" variant="outline" onClick={() => openCapture("action")}>
          <ListChecks size={14} className="mr-1" />
          Atribuição
        </Button>
        <Button size="sm" variant="outline" onClick={() => openCapture("highlight")}>
          <BookmarkSimple size={14} className="mr-1" />
          Momento
        </Button>
      </div>

      {captureMode && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            ref={inputRef}
            placeholder={
              captureMode === "decision"
                ? "O que foi decidido?"
                : captureMode === "action"
                  ? "O que precisa ser feito?"
                  : "Descreva o momento..."
            }
            value={captureText}
            onChange={(e) => setCaptureText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submitCapture();
              if (e.key === "Escape") {
                setCaptureMode(null);
                setCaptureText("");
              }
            }}
          />
          <div className="flex gap-2">
            <Button size="sm" disabled={busy || !captureText.trim()} onClick={() => void submitCapture()}>
              Salvar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setCaptureMode(null);
                setCaptureText("");
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {decisions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Decisões capturadas</p>
          <ul className="space-y-1.5">
            {decisions.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-2 rounded-md border border-border/60 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatTimestamp(item.captured_at_ms)}
                  </span>
                  <p className="mt-0.5">{item.text}</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 shrink-0"
                  onClick={() => void removeDecision(item.id)}
                >
                  <Trash size={14} />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        ref={scrollRef}
        className="max-h-64 overflow-y-auto rounded-md border border-border/60 bg-background/60 p-3"
      >
        {segments.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {phase === "joining"
              ? "O bot está entrando na call. A transcrição aparecerá em instantes."
              : phase === "in_call"
                ? "Bot na reunião. Aguardando início da transcrição…"
                : phase === "stopping"
                  ? "Encerrando gravação. Os trechos finais podem ainda chegar…"
                  : transcriptionActive
                    ? "Aguardando trechos de transcrição…"
                    : "Transcrição ainda não disponível."}
          </p>
        ) : (
          <ul className="space-y-2">
            {segments.slice(-40).map((segment, index) => (
              <li key={`${segment.start_ms ?? index}-${segment.text.slice(0, 24)}`} className="text-sm">
                <span className="text-xs font-medium text-brand">{segment.speaker}</span>
                {segment.start_ms != null && (
                  <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                    {formatTimestamp(segment.start_ms)}
                  </span>
                )}
                <p className="text-foreground/90">{segment.text}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
