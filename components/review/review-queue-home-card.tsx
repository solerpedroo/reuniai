import Link from "next/link";
import { ArrowRight, ClipboardText } from "@phosphor-icons/react/dist/ssr";

export function ReviewQueueHomeCard({ pendingCount }: { pendingCount: number }) {
  if (pendingCount <= 0) return null;

  return (
    <Link
      href="/revisar"
      className="surface-card mt-4 flex items-center justify-between gap-3 p-4 transition-colors hover:border-brand/30"
    >
      <div className="flex items-center gap-3">
        <ClipboardText size={20} className="text-brand" aria-hidden />
        <div>
          <p className="text-sm font-medium">
            {pendingCount} reunião{pendingCount === 1 ? "" : "ões"} para revisar
          </p>
          <p className="text-xs text-muted-foreground">
            Feche atribuições e follow-ups em lote na fila de revisão
          </p>
        </div>
      </div>
      <ArrowRight size={16} className="shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}
