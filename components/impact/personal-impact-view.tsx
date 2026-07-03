"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  ChartLineUp,
  CheckCircle,
  Clock,
  Handshake,
  Sparkle,
  Timer,
} from "@phosphor-icons/react";
import { InsightsHoursChart } from "@/components/insights/insights-hours-chart";
import { Button } from "@/components/ui/button";
import {
  IMPACT_PERIODS,
  type ImpactPeriod,
  type PersonalImpactReport,
} from "@/lib/impact/personal-impact-types";
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
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

export function PersonalImpactView({ report }: { report: PersonalImpactReport }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function setPeriod(period: ImpactPeriod) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  async function downloadPdf() {
    const res = await fetch(`/api/impact/pdf?period=${report.period}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `reuniai-impacto-${report.period}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {IMPACT_PERIODS.map((option) => (
          <Button
            key={option.value}
            variant={report.period === option.value ? "default" : "outline"}
            size="sm"
            disabled={pending}
            onClick={() => setPeriod(option.value)}
            className={cn(report.period === option.value && "bg-brand hover:bg-brand/90")}
          >
            {option.label}
          </Button>
        ))}
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => void downloadPdf()}>
          Exportar PDF
        </Button>
      </div>

      {report.narrative ? (
        <div className="surface-card border-brand/20 bg-brand/5 p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Sparkle size={16} className="text-brand" />
            Retrospectiva
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{report.narrative}</p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Horas em reunião"
          value={formatHours(report.insights.hoursRecordedMs)}
          detail={`${report.insights.meetingCount} reuniões`}
          icon={Clock}
        />
        <StatCard
          label="Coach (média)"
          value={report.avgCoachScore != null ? String(report.avgCoachScore) : "—"}
          detail="Score das reuniões com relatório"
          icon={ChartLineUp}
        />
        <StatCard
          label="Tarefas concluídas"
          value={
            report.insights.taskCompletionRate != null
              ? `${report.insights.taskCompletionRate}%`
              : "—"
          }
          detail={`${report.insights.doneTasksInPeriod} fechadas no período`}
          icon={CheckCircle}
        />
        <StatCard
          label="Compromissos"
          value={
            report.commitmentsFulfilledRate != null
              ? `${report.commitmentsFulfilledRate}%`
              : "—"
          }
          detail="Taxa de cumprimento verbal"
          icon={Handshake}
        />
        <StatCard
          label="Decisões cumpridas"
          value={report.decisionsDoneRate != null ? `${report.decisionsDoneRate}%` : "—"}
          detail="Registro de outcomes"
          icon={Timer}
        />
        <StatCard
          label="Follow-ups"
          value={String(report.followUpsSent)}
          detail="Emails enviados no período"
          icon={Sparkle}
        />
      </div>

      <InsightsHoursChart data={report.insights.weeklyHours} />

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/hoje" className="text-brand hover:underline">
          Briefing de hoje
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/semana" className="text-brand hover:underline">
          Revisão semanal
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/planejar" className="text-brand hover:underline">
          Planejar
        </Link>
      </div>
    </div>
  );
}
