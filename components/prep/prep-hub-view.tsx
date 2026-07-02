"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  CalendarBlank,
  ChatCircle,
  Clock,
  Note,
  Sparkle,
} from "@phosphor-icons/react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  PREP_HUB_PERIODS,
  type PrepHubPeriod,
  type PrepHubResult,
} from "@/lib/prep/hub-types";
import { formatMeetingDate } from "@/lib/meetings/types";
import { cn } from "@/lib/utils";

export function PrepHubView({ hub }: { hub: PrepHubResult }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function setPeriod(period: PrepHubPeriod) {
    const params = new URLSearchParams(searchParams.toString());
    if (period === "7d") params.delete("dias");
    else params.set("dias", "14");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {PREP_HUB_PERIODS.map((option) => (
          <Button
            key={option.value}
            variant={hub.period === option.value ? "default" : "outline"}
            size="sm"
            disabled={pending}
            onClick={() => setPeriod(option.value)}
            className={cn(hub.period === option.value && "bg-brand hover:bg-brand/90")}
          >
            {option.label}
          </Button>
        ))}
        <Button variant="outline" size="sm" asChild className="ml-auto">
          <Link href="/agenda">Ver agenda do dia</Link>
        </Button>
      </div>

      {hub.items.length === 0 ? (
        <EmptyState
          icon={CalendarBlank}
          title="Nenhuma reunião futura"
          description={`Não há reuniões agendadas nos próximos ${hub.period === "14d" ? "14" : "7"} dias.`}
        >
          <Button asChild variant="outline">
            <Link href="/reunioes">Ver reuniões</Link>
          </Button>
        </EmptyState>
      ) : (
        <ul className="space-y-4">
          {hub.items.map((item) => {
            const startsIn = Math.max(
              0,
              Math.round((new Date(item.startedAt).getTime() - Date.now()) / 60_000)
            );

            return (
              <li key={item.meetingId} className="surface-card space-y-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={14} aria-hidden />
                        {startsIn <= 0
                          ? "Começando agora"
                          : `Em ${startsIn} min · ${formatMeetingDate(item.startedAt)}`}
                      </span>
                      {item.prep && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                          <Sparkle size={12} aria-hidden />
                          Prep pronto
                        </span>
                      )}
                    </p>
                    {item.participantSubtitle && (
                      <p className="mt-2 text-sm text-muted-foreground">{item.participantSubtitle}</p>
                    )}
                  </div>
                  <Button size="sm" asChild>
                    <Link href={`/reunioes/${item.meetingId}`}>Abrir</Link>
                  </Button>
                </div>

                {item.prep?.briefing && (
                  <p className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm leading-relaxed">
                    {item.prep.briefing}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 text-xs">
                  {item.participantContextCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-muted-foreground">
                      <Note size={12} aria-hidden />
                      {item.participantContextCount} nota
                      {item.participantContextCount === 1 ? "" : "s"} de participante
                    </span>
                  )}
                  {item.lastSeriesMeeting && (
                    <Link
                      href={`/reunioes/${item.lastSeriesMeeting.id}`}
                      className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-muted-foreground hover:text-brand"
                    >
                      <ChatCircle size={12} aria-hidden />
                      Última da série: {item.lastSeriesMeeting.title}
                    </Link>
                  )}
                  {item.seriesId && (
                    <Link
                      href={`/series/${encodeURIComponent(item.seriesId)}`}
                      className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-muted-foreground hover:text-brand"
                    >
                      Ver série
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
