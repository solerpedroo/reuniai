"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Clock, TrendUp, Users, CheckCircle, Timer } from "@phosphor-icons/react";
import { InsightsHoursChart } from "@/components/insights/insights-hours-chart";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  INSIGHT_PERIODS,
  type InsightPeriod,
  type PeriodInsights,
} from "@/lib/insights/period-stats";
import { formatHours } from "@/lib/meetings/types";
import { cn } from "@/lib/utils";

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Clock;
}) {
  return (
    <div className="surface-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon size={16} className="text-muted-foreground/70" aria-hidden />
      </div>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

export function InsightsDashboard({ insights }: { insights: PeriodInsights }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function setPeriod(period: InsightPeriod) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const empty = insights.meetingCount === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {INSIGHT_PERIODS.map((option) => (
          <Button
            key={option.value}
            variant={insights.period === option.value ? "default" : "outline"}
            size="sm"
            disabled={pending}
            onClick={() => setPeriod(option.value)}
            className={cn(insights.period === option.value && "bg-brand hover:bg-brand/90")}
          >
            {option.label}
          </Button>
        ))}
        {insights.period === "7d" && (
          <Button variant="outline" size="sm" asChild className="ml-auto">
            <Link href="/semana">Ver revisão completa</Link>
          </Button>
        )}
        {insights.meetingCount >= 5 && (
          <Button variant="outline" size="sm" asChild className={insights.period === "7d" ? "" : "ml-auto"}>
            <Link href="/participacao">Ver participação</Link>
          </Button>
        )}
      </div>

      {empty ? (
        <EmptyState
          icon={TrendUp}
          tone="brand"
          title="Sem dados neste período"
          description="Grave e processe reuniões para ver tendências aqui."
        >
          <Button asChild variant="outline">
            <Link href="/reunioes">Ver reuniões</Link>
          </Button>
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Reuniões processadas"
              value={String(insights.meetingCount)}
              detail="Concluídas ou parciais"
              icon={TrendUp}
            />
            <StatCard
              label="Horas gravadas"
              value={formatHours(insights.hoursRecordedMs)}
              detail="Tempo total no período"
              icon={Clock}
            />
            <StatCard
              label="Conclusão de tarefas"
              value={
                insights.taskCompletionRate != null
                  ? `${Math.round(insights.taskCompletionRate * 100)}%`
                  : "—"
              }
              detail={`${insights.doneTasksInPeriod} feitas · ${insights.openTasksInPeriod} abertas`}
              icon={CheckCircle}
            />
            <StatCard
              label="Revisão pós-call"
              value={
                insights.avgReviewHours != null ? `${insights.avgReviewHours}h` : "—"
              }
              detail={
                insights.reviewedMeetingsCount > 0
                  ? `Média em ${insights.reviewedMeetingsCount} reuniões`
                  : "Sem revisões registradas"
              }
              icon={Timer}
            />
          </div>

          <InsightsHoursChart data={insights.weeklyHours} />

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="surface-card p-5">
              <h2 className="text-sm font-semibold">Decisões em destaque</h2>
              <p className="mb-3 text-xs text-muted-foreground">
                Mais recorrentes nos resumos do período
              </p>
              {insights.topDecisions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma decisão registrada.</p>
              ) : (
                <ul className="space-y-2">
                  {insights.topDecisions.map((decision) => (
                    <li
                      key={decision}
                      className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm"
                    >
                      {decision}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="surface-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <Users size={16} className="text-muted-foreground" />
                <h2 className="text-sm font-semibold">Participantes frequentes</h2>
              </div>
              {insights.topParticipants.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem participantes no período.</p>
              ) : (
                <ul className="space-y-2">
                  {insights.topParticipants.map((participant) => (
                    <li
                      key={participant.label}
                      className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
                    >
                      <span className="truncate">{participant.label}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {participant.count}×
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
