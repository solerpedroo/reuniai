import { Info, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import type { Meeting } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const PROCESSING_STEPS = [
  { key: "recording", label: "Gravando" },
  { key: "processing", label: "Transcrevendo" },
  { key: "done", label: "Analisando" },
] as const;

function getProcessingStep(status: Meeting["status"]): number {
  if (status === "bot_joining") return 0;
  if (status === "recording") return 0;
  if (status === "processing") return 1;
  return 2;
}

export function MeetingStatusBanner({ meeting }: { meeting: Meeting }) {
  const { status, error_message } = meeting;

  if (status === "bot_joining" || status === "recording" || status === "processing") {
    const label =
      status === "processing"
        ? "Processando a reunião (transcrição e análise por IA)…"
        : status === "recording"
          ? "O bot está gravando esta reunião…"
          : "O bot está entrando na reunião…";

    const step = getProcessingStep(status);

    return (
      <div className="surface-toolbar mb-6 px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand/12">
            <Info size={14} className="text-brand status-pulse" />
          </span>
          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-sm text-foreground">{label}</p>
            <div className="flex flex-wrap items-center gap-2">
              {PROCESSING_STEPS.map((item, index) => (
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
                  {index < PROCESSING_STEPS.length - 1 && (
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
