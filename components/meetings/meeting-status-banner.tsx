import { CheckCircle, Info, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { LiveAutoLeaveCountdown } from "@/components/meetings/live-auto-leave-countdown";
import {
  deriveBotUiPhase,
  getLiveStepIndex,
  getLiveStepLabels,
  getPhaseBannerMessage,
  shouldShowLiveSessionBadges,
} from "@/lib/meetings/bot-lifecycle";
import type { MeetingSessionResponse } from "@/lib/meetings/use-meeting-session";
import type { Meeting } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export function MeetingStatusBanner({
  meeting,
  session,
}: {
  meeting: Meeting;
  session?: MeetingSessionResponse | null;
}) {
  const { status, error_message } = meeting;
  const liveSession = session?.session;
  const phase = deriveBotUiPhase(status, liveSession);

  if (phase === "joining" || phase === "in_call" || phase === "recording" || phase === "stopping" || phase === "processing") {
    const label = getPhaseBannerMessage(phase);
    const step = getLiveStepIndex(phase);
    const steps = getLiveStepLabels();

    return (
      <div className="surface-toolbar mb-6 px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand/12">
            <Info size={14} className="text-brand status-pulse" />
          </span>
          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-sm text-foreground">{label}</p>

            {liveSession && shouldShowLiveSessionBadges(phase) && (
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
                      : liveSession.connected
                        ? "Aguardando transcrição"
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
                        : liveSession.connected
                          ? "Aguardando gravação"
                          : "Gravação pendente"
                  }
                />
                {liveSession.participants.humanCount != null && (
                  <SessionBadge
                    ok={liveSession.participants.humanCount > 0}
                    label={
                      liveSession.participants.humanCount === 0
                        ? "Sala vazia"
                        : liveSession.participants.humanCount === 1
                          ? "1 pessoa na call"
                          : `${liveSession.participants.humanCount} pessoas na call`
                    }
                  />
                )}
                {liveSession.participants.humanCount === 0 &&
                  liveSession.participants.autoLeaveAt && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-400">
                      <LiveAutoLeaveCountdown autoLeaveAt={liveSession.participants.autoLeaveAt} />
                    </span>
                  )}
              </div>
            )}

            {session?.message && !liveSession && phase !== "processing" && (
              <p className="text-xs text-muted-foreground">{session.message}</p>
            )}

            {step >= 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {steps.map((item, index) => (
                  <span key={item} className="inline-flex items-center gap-1.5 text-xs">
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
                      {item}
                    </span>
                    {index < steps.length - 1 && (
                      <span className="text-muted-foreground/40">→</span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (status === "failed" || phase === "failed") {
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

  if (status === "partial" || phase === "partial") {
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
