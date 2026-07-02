import Link from "next/link";
import { ArrowRight, CalendarCheck } from "@phosphor-icons/react/dist/ssr";

export function WeeklyReviewHomeCard({
  pendingCount,
}: {
  pendingCount: number;
}) {
  return (
    <Link
      href="/semana"
      className="surface-card mt-4 flex items-center justify-between gap-3 p-4 transition-colors hover:border-brand/30"
    >
      <div className="flex items-center gap-3">
        <CalendarCheck size={20} className="text-brand" aria-hidden />
        <div>
          <p className="text-sm font-medium">Revisão da semana</p>
          <p className="text-xs text-muted-foreground">
            {pendingCount > 0
              ? `${pendingCount} pendência${pendingCount === 1 ? "" : "s"} para fechar a semana`
              : "Resumo, decisões e plano para a próxima semana"}
          </p>
        </div>
      </div>
      <ArrowRight size={16} className="shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}
