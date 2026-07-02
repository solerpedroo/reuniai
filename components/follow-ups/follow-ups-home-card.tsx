import Link from "next/link";
import { ArrowRight, EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";

export function FollowUpsHomeCard({ pendingCount }: { pendingCount: number }) {
  if (pendingCount <= 0) return null;

  return (
    <Link
      href="/follow-ups"
      className="surface-card mt-4 flex items-center justify-between gap-3 p-4 transition-colors hover:border-brand/30"
    >
      <div className="flex items-center gap-3">
        <EnvelopeSimple size={20} className="text-brand" aria-hidden />
        <div>
          <p className="text-sm font-medium">
            {pendingCount} follow-up{pendingCount === 1 ? "" : "s"} pendente
            {pendingCount === 1 ? "" : "s"}
          </p>
          <p className="text-xs text-muted-foreground">
            Rascunhos e envios aguardando fechamento
          </p>
        </div>
      </div>
      <ArrowRight size={16} className="shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}
