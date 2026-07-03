import { CheckCircle, Info, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import type { MeetingSessionResponse } from "@/lib/meetings/use-meeting-session";
import type { Meeting } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const LIVE_STEPS = [
  { key: "joining", label: "Entrando" },
  { key: "recording", label: "Gravando" },
  { key: "processing", label: "Transcrevendo" },
  { key: "done", label: "Analisando" },
] as const;

function getLiveStep(
  status: Meeting["status"],
  session?: MeetingSessionResponse["session"]
): number {
  const vexaActive =
    session?.vexaStatus === "active" ||
    session?.vexaStatus === "stopping" ||
    (session?.transcription.segmentCount ?? 0) > 0;

  if (status === "bot_joining") return vexaActive ? 1 : 0;
  if (status === "recording") return 1;
  if (status === "processing") return 2;
  return 3;
}

export function MeetingStatusBanner({
  meeting,
  session,
}: {
  meeting: Meeting;
  session?: MeetingSessionResponse | null;
}) {
  const { status, error_message } = meeting;
  const liveSession = session?.session;

  if (status === "bot_joining" || status === "recording" || status === "processing") {
    const label =
      status === "processing"
        ? "Processando a reunião (transcrição e análise por IA)…"
        : status === "recording" || (status === "bot_joining" && liveSession?.transcription.active)
          ? liveSession?.transcription.active
            ? "O bot está gravando e transcrevendo esta reunião."
            : "O bot entrou na reunião. Aguardando confirmação da transcrição…"
          : "O bot está entrando na reunião…";

    const step = getLiveStep(status, liveSession);

    return (
      <div className="surface-toolbar mb-6 px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand/12">
            <Info size={14} className="text-brand status-pulse" />
          </span>
          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-sm text-foreground">{label}</p>

            {liveSession && status !== "processing" && (
              <div className="flex flex-wrap gap-2">
                <SessionBadge
                  ok={liveSession.connected}
                  label={liveSession.connected ? "Bot na reunião" : "Conectando bot"}
                />
                <SessionBadge
                  ok={liveSession.transcription.active}
                  label={
                    liveSession.transcription.active
                      ? `Transcrição ativa (${liveSession.transcription.segmentCount} trechos)`
                      : "Transcrição pendente"
                  }
                />
                <SessionBadge
                  ok={liveSession.recording.capturing || liveSession.recording.available}
                  label={
                    liveSession.recording.available
                      ? "Gravação salva"
                      : liveSession.recording.capturing
                        ? "Gravando áudio"
                        : "Gravação pendente"
                  }
                />
              </div>
            )}

            {session?.message && !liveSession && status !== "processing" && (
              <p className="text-xs text-muted-foreground">{session.message}</p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {LIVE_STEPS.map((item, index) => (
                <span key={item.key} className="inline-flex items-center gap-1.5 text-xs">
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      index <= step ? "bg-brand status-pulse" : "bg-muted-foreground/30"
                    )}
                  />
                  <span
                    className={cn(
                      index <= step ? "font-medium text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                  {index < LIVE_STEPS.length - 1 && (
                    <span className="text-muted-foreground/40">→</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="mb-6 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        <WarningCircle size={16} className="mt-0.5 shrink-0" />
        <span>
          Falha no processamento desta reunião.
          {error_message ? <span className="block text-destructive/80">{error_message}</span> : null}
        </span>
      </div>
    );
  }

  if (status === "partial") {
    return (
      <div className="mb-6 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
        <WarningCircle size={16} className="shrink-0" />
        Transcrição parcial disponível (o bot pode ter sido removido antes do fim).
      </div>
    );
  }

  return null;
}

function SessionBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
        ok
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
          : "bg-muted text-muted-foreground"
      )}
    >
      {ok ? <CheckCircle size={12} weight="fill" /> : <span className="size-1.5 rounded-full bg-current opacity-50" />}
      {label}
    </span>
  );
}
