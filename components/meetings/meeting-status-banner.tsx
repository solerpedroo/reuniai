import { Info, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import type { Meeting } from "@/lib/supabase/types";

export function MeetingStatusBanner({ meeting }: { meeting: Meeting }) {
  const { status, error_message } = meeting;

  if (status === "bot_joining" || status === "recording" || status === "processing") {
    const label =
      status === "processing"
        ? "Processando a reunião (transcrição e análise por IA)…"
        : status === "recording"
          ? "O bot está gravando esta reunião…"
          : "O bot está entrando na reunião…";
    return (
      <div className="mb-6 flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
        <Info size={16} className="shrink-0 text-brand" />
        {label}
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
