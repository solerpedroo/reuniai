import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

export function ReviewQueueBanner({ pendingCount }: { pendingCount: number }) {
  if (pendingCount <= 1) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3">
      <p className="text-sm text-muted-foreground">
        Você tem{" "}
        <span className="font-medium text-foreground">
          {pendingCount} reuniões
        </span>{" "}
        aguardando revisão.
      </p>
      <Link
        href="/revisar"
        className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
      >
        Ver todas na fila
        <ArrowRight size={14} aria-hidden />
      </Link>
    </div>
  );
}
