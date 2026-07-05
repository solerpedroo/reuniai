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

export function RecordingPlayer({
  meetingId,
  currentTimeMs,
  onTimeUpdate,
  onSeek,
  className,
}: {
  meetingId: string;
  currentTimeMs: number;
  onTimeUpdate: (ms: number) => void;
  onSeek: (ms: number) => void;
  className?: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [muted, setMuted] = useState(false);
  const [rateIndex, setRateIndex] = useState(1);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/meetings/${meetingId}/recording`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) setError(data.error ?? "Gravação indisponível");
          return;
        }
        if (!cancelled) setUrl(data.url);
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
  }, [meetingId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !url) return;
    const diff = Math.abs(audio.currentTime * 1000 - currentTimeMs);
    if (audio.paused || diff > 250) {
      audio.currentTime = currentTimeMs / 1000;
    }
  }, [currentTimeMs, url]);

  const handleSeek = useCallback(
    (ms: number) => {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = ms / 1000;
      }
      onSeek(ms);
    },
    [onSeek]
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

  const progress = durationMs > 0 ? (currentTimeMs / durationMs) * 100 : 0;

  return (
    <div className={cn("surface-card space-y-3 p-4", className)}>
      <audio
        ref={audioRef}
        src={url}
        muted={muted}
        preload="metadata"
        onLoadedMetadata={(e) => setDurationMs(e.currentTarget.duration * 1000)}
        onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime * 1000)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => {
          setPlaying(false);
          setError("Erro ao reproduzir a gravação.");
        }}
      />

      <div className="flex items-center gap-2">
        <Button type="button" size="icon" variant="brand" className="size-9 shrink-0" onClick={() => void togglePlay()}>
          {playing ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
        </Button>

        <div className="min-w-0 flex-1">
          <input
            type="range"
            min={0}
            max={durationMs || 1}
            value={currentTimeMs}
            onChange={(e) => handleSeek(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer accent-brand"
            aria-label="Posição da gravação"
          />
          <div className="mt-1 flex justify-between text-[11px] tabular-nums text-muted-foreground">
            <span>{formatTimestamp(currentTimeMs)}</span>
            <span>{formatTimestamp(durationMs)}</span>
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

      <div
        className="h-1 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
