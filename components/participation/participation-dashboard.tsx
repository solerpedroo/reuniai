"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ChartBar, Microphone, Scales, UsersThree, Warning } from "@phosphor-icons/react";
import { TalkTimeChart } from "@/components/meetings/talk-time-chart";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  TALK_TIME_PERIODS,
  type TalkTimePeriod,
  type TalkTimeStats,
} from "@/lib/insights/talk-time-types";
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
  icon: typeof Microphone;
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

export function ParticipationDashboard({ stats }: { stats: TalkTimeStats }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function setPeriod(period: TalkTimePeriod) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const empty = stats.analyzedMeetings === 0;
  const chartData = stats.topSpeakers.map((speaker) => ({
    speaker: speaker.speaker,
    durationMs: speaker.durationMs,
    percentage: speaker.percentage,
    wordCount: 0,
    turnCount: speaker.meetingCount,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {TALK_TIME_PERIODS.map((option) => (
          <Button
            key={option.value}
            variant={stats.period === option.value ? "default" : "outline"}
            size="sm"
            disabled={pending}
            onClick={() => setPeriod(option.value)}
            className={cn(stats.period === option.value && "bg-brand hover:bg-brand/90")}
          >
            {option.label}
          </Button>
        ))}
        <Button variant="outline" size="sm" asChild className="ml-auto">
          <Link href="/insights">Ver insights gerais</Link>
        </Button>
      </div>

      {empty ? (
        <EmptyState
          icon={Microphone}
          title="Sem dados de participação"
          description="Grave e processe reuniões com transcrição para ver quem fala quanto."
        >
          <Button asChild>
            <Link href="/reunioes">Ver reuniões</Link>
          </Button>
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Horas faladas"
              value={formatHours(stats.totalTalkMs)}
              detail={`${stats.analyzedMeetings} reuniões analisadas`}
              icon={Microphone}
            />
            <StatCard
              label="Speakers únicos"
              value={String(stats.uniqueSpeakers)}
              detail={`Em ${stats.meetingCount} reuniões no período`}
              icon={UsersThree}
            />
            <StatCard
              label="Equilíbrio médio"
              value={`${stats.avgBalanceScore}`}
              detail="0 = dominante · 100 = balanceado"
              icon={Scales}
            />
            <StatCard
              label="Mais dominante"
              value={stats.dominantSpeaker?.split(" ")[0] ?? "—"}
              detail={
                stats.dominantSpeaker
                  ? `${stats.topSpeakers[0]?.percentage ?? 0}% do tempo total`
                  : "Sem speakers"
              }
              icon={ChartBar}
            />
          </div>

          {chartData.length > 1 && <TalkTimeChart data={chartData} />}

          {stats.oneOnOnes.length > 0 && (
            <section className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold tracking-tight">Suas 1:1s</h2>
                <p className="text-xs text-muted-foreground">
                  Ratio de fala — alerta quando passa de 70/30
                </p>
              </div>
              <ul className="space-y-2">
                {stats.oneOnOnes.slice(0, 8).map((meeting) => (
                  <li key={meeting.meetingId}>
                    <Link
                      href={`/reunioes/${meeting.meetingId}`}
                      className={cn(
                        "surface-card flex flex-col gap-2 p-4 transition-colors hover:border-brand/30 sm:flex-row sm:items-center sm:justify-between",
                        meeting.imbalanced && "border-amber-500/30 bg-amber-500/[0.03]"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{meeting.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Você {meeting.selfPercent}% · {meeting.otherSpeaker}{" "}
                          {meeting.otherPercent}%
                        </p>
                      </div>
                      {meeting.imbalanced && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                          <Warning size={14} aria-hidden />
                          Desbalanceado
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {stats.bySeries.length > 0 && (
            <section className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold tracking-tight">Por série</h2>
                <p className="text-xs text-muted-foreground">
                  Talk-time agregado em reuniões recorrentes
                </p>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {stats.bySeries.map((series) => (
                  <div key={series.seriesId} className="surface-card space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{series.seriesTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {series.meetingCount} ocorrências
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/series/${encodeURIComponent(series.seriesId)}`}>Ver série</Link>
                      </Button>
                    </div>
                    <ul className="space-y-1.5">
                      {series.speakers.map((speaker) => (
                        <li
                          key={speaker.speaker}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="truncate">{speaker.speaker}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {speaker.percentage}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
