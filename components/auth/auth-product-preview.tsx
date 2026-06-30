import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

type AuthProductPreviewProps = {
  compact?: boolean;
  className?: string;
};

const ACTION_ITEMS = ["Enviar roadmap revisado", "Agendar review com design"] as const;

export function AuthProductPreview({ compact = false, className }: AuthProductPreviewProps) {
  return (
    <div
      className={cn(
        "auth-preview-card",
        compact && "auth-preview-card-compact",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-[13px] font-semibold tracking-tight text-foreground">
          Weekly de Produto
        </p>
        <span className="shrink-0 rounded-md bg-emerald-500/12 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
          Concluída
        </span>
      </div>

      <p className="text-[11px] text-muted-foreground">Hoje · 47 min · Google Meet</p>

      {!compact && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Time alinhou prioridades do trimestre. Decisão de adiar o lançamento mobile para
          consolidar a experiência web.
        </p>
      )}

      <div className={cn("space-y-2", compact && "pt-0.5")}>
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Action items
        </p>
        <ul className="space-y-1.5" role="list">
          {ACTION_ITEMS.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-[12px] leading-snug text-foreground/90"
            >
              <CheckCircle
                size={14}
                weight="fill"
                className="mt-0.5 shrink-0 text-brand/80"
                aria-hidden
              />
              <span className={cn(compact && "line-clamp-1")}>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
