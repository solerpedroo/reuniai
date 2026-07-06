"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Pause,
  Play,
  SpeakerHigh,
  SpeakerSlash,
  Spinner,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { formatTimestamp } from "@/lib/meetings/transcript";
import { cn } from "@/lib/utils";

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2] as const;

function parseAudioDurationMs(seconds: number): number | null {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return Math.round(seconds * 1000);
}

function resolveDurationMs(
  ...candidates: Array<number | null | undefined>
): number {
  for (const candidate of candidates) {
    if (candidate != null && Number.isFinite(candidate) && candidate > 0) {
      return Math.round(candidate);
    }
  }
  return 0;
}

export function RecordingPlayer({
  meetingId,
  currentTimeMs,
  onTimeUpdate,
  onSeek,
  fallbackDurationMs,
  className,
}: {
  meetingId: string;
  currentTimeMs: number;
  onTimeUpdate: (ms: number) => void;
  onSeek: (ms: number) => void;
  /** Duração conhecida quando o `<audio>` não expõe metadados (stream sem Content-Length). */
  fallbackDurationMs?: number;
  className?: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const pendingSeekMs = useRef(0);
  const apiDurationMs = useRef<number | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [muted, setMuted] = useState(false);
  const [rateIndex, setRateIndex] = useState(1);
  const [ready, setReady] = useState(false);

  const applyDuration = useCallback(
    (audioSeconds: number | null | undefined) => {
      const next = resolveDurationMs(
        audioSeconds != null ? audioSeconds * 1000 : null,
        apiDurationMs.current,
        fallbackDurationMs
      );
      if (next > 0) setDurationMs(next);
    },
    [fallbackDurationMs]
  );

  useEffect(() => {
    pendingSeekMs.current = currentTimeMs;
  }, [currentTimeMs]);

  useEffect(() => {
    const initial = resolveDurationMs(fallbackDurationMs);
    if (initial > 0) setDurationMs(initial);
  }, [fallbackDurationMs]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setReady(false);
      apiDurationMs.current = null;

      try {
        const res = await fetch(`/api/meetings/${meetingId}/recording`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) setError(data.error ?? "Gravação indisponível");
          return;
        }
        if (!data.url || typeof data.url !== "string") {
          if (!cancelled) setError("Gravação indisponível");
          return;
        }

        if (typeof data.durationSeconds === "number" && data.durationSeconds > 0) {
          apiDurationMs.current = Math.round(data.durationSeconds * 1000);
        }

        if (!cancelled) {
          setUrl(data.url);
          applyDuration(null);
        }
      } catch {
        if (!cancelled) setError("Falha ao carregar gravação");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [meetingId, applyDuration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !url || !ready) return;

    const maxMs = durationMs > 0 ? durationMs : undefined;
    const targetMs = maxMs != null ? Math.min(pendingSeekMs.current, maxMs) : pendingSeekMs.current;
    const diff = Math.abs(audio.currentTime * 1000 - targetMs);
    if (diff > 250) {
      audio.currentTime = targetMs / 1000;
    }
  }, [currentTimeMs, url, ready, durationMs]);

  const handleSeek = useCallback(
    (ms: number) => {
      const clamped =
        durationMs > 0 ? Math.min(Math.max(0, ms), durationMs) : Math.max(0, ms);
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = clamped / 1000;
      }
      onSeek(clamped);
    },
    [durationMs, onSeek]
  );

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
        setError("Não foi possível reproduzir a gravação.");
      }
    } else {
      audio.pause();
      setPlaying(false);
    }
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if (event.code === "Space" && event.target === document.body) {
        event.preventDefault();
        void togglePlay();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [togglePlay]);

  if (loading) {
    return (
      <div className={cn("surface-card flex items-center gap-3 px-4 py-3", className)}>
        <Spinner size={18} className="animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Carregando gravação…</span>
      </div>
    );
  }

  if (error || !url) {
    return (
      <div className={cn("surface-card px-4 py-3 text-sm text-muted-foreground", className)}>
        {error ?? "Gravação não disponível para esta reunião."}
      </div>
    );
  }

  const sliderMax = durationMs > 0 ? durationMs : Math.max(currentTimeMs, 1);
  const sliderValue = durationMs > 0 ? Math.min(currentTimeMs, durationMs) : currentTimeMs;

  return (
    <div className={cn("surface-card space-y-3 p-4", className)}>
      <audio
        ref={audioRef}
        src={url}
        muted={muted}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const resolved = resolveDurationMs(
            parseAudioDurationMs(e.currentTarget.duration),
            apiDurationMs.current,
            fallbackDurationMs
          );
          if (resolved > 0) setDurationMs(resolved);
          setReady(true);
          const targetMs = pendingSeekMs.current;
          if (targetMs > 0) {
            e.currentTarget.currentTime =
              resolved > 0 ? Math.min(targetMs, resolved) / 1000 : targetMs / 1000;
          }
        }}
        onDurationChange={(e) => {
          applyDuration(parseAudioDurationMs(e.currentTarget.duration));
        }}
        onTimeUpdate={(e) => {
          const ms = e.currentTarget.currentTime * 1000;
          onTimeUpdate(durationMs > 0 ? Math.min(ms, durationMs) : ms);
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => {
          setPlaying(false);
          setReady(false);
          setError("Erro ao reproduzir a gravação.");
        }}
      />

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="icon"
          variant="brand"
          className="size-9 shrink-0"
          onClick={() => void togglePlay()}
        >
          {playing ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
        </Button>

        <div className="min-w-0 flex-1">
          <input
            type="range"
            min={0}
            max={sliderMax}
            value={sliderValue}
            onChange={(e) => handleSeek(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer accent-brand"
            aria-label="Posição da gravação"
          />
          <div className="mt-1 flex justify-between text-[11px] tabular-nums text-muted-foreground">
            <span>{formatTimestamp(sliderValue)}</span>
            <span>{durationMs > 0 ? formatTimestamp(durationMs) : "--:--"}</span>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 shrink-0 px-2 text-xs"
          onClick={() => {
            const next = (rateIndex + 1) % PLAYBACK_RATES.length;
            setRateIndex(next);
            if (audioRef.current) audioRef.current.playbackRate = PLAYBACK_RATES[next]!;
          }}
        >
          {PLAYBACK_RATES[rateIndex]}×
        </Button>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8"
          onClick={() => setMuted((value) => !value)}
          aria-label={muted ? "Ativar som" : "Silenciar"}
        >
          {muted ? <SpeakerSlash size={16} /> : <SpeakerHigh size={16} />}
        </Button>
      </div>
    </div>
  );
}
