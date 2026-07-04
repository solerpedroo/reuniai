"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle,
  CheckSquare,
  ClipboardText,
  ArrowsClockwise,
  Sparkle,
  VideoCamera,
} from "@phosphor-icons/react";
import { WeekDateNav } from "@/components/review/week-date-nav";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import type { WeeklyReviewData } from "@/lib/review/weekly-review";
import { formatHours, formatMeetingDateTime } from "@/lib/meetings/types";
import { inboxHref } from "@/lib/meetings/action-items-inbox";

function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="surface-card space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function formatDueDate(date: string): string {
  try {
    return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return date;
  }
}

export function WeeklyReviewView({ data }: { data: WeeklyReviewData }) {
  const hasActivity =
    data.meetingCount > 0 ||
    data.unreviewedMeetings.length > 0 ||
    data.overdueTasks.length > 0 ||
    data.dueNextWeekTasks.length > 0 ||
    data.upcomingMeetings.length > 0;

  return (
    <div className="space-y-6">
      <WeekDateNav
        weekKey={data.weekKey}
        weekLabel={data.weekLabel}
        isCurrentWeek={data.isCurrentWeek}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Reuniões processadas</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{data.meetingCount}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Horas gravadas</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {data.hoursRecordedMs > 0 ? formatHours(data.hoursRecordedMs) : "0h"}
          </p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Conclusão de tarefas</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {data.taskCompletionRate != null ? `${data.taskCompletionRate}%` : "—"}
          </p>
          {data.openTasksTotal > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {data.openTasksDone}/{data.openTasksTotal} com prazo na semana
            </p>
          )}
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Pendências de revisão</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {data.unreviewedMeetings.length}
          </p>
        </div>
      </div>

      {!hasActivity ? (
        <EmptyState
          icon={CalendarCheck}
          tone="brand"
          title="Semana tranquila"
          description="Nenhuma reunião ou tarefa relevante neste período."
        >
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/reunioes">Ver reuniões</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/insights?period=7d">Ver insights</Link>
            </Button>
          </div>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel
            title="Reuniões não revisadas"
            action={
              data.unreviewedMeetings.length > 0 ? (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/revisar">
                    Ver fila
                    <ArrowRight size={14} className="ml-1" />
                  </Link>
                </Button>
              ) : null
            }
          >
            {data.unreviewedMeetings.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todas as calls da semana foram revisadas.</p>
            ) : (
              <ul className="space-y-2">
                {data.unreviewedMeetings.map((meeting) => (
                  <li key={meeting.id}>
                    <Link
                      href={`/reunioes/${meeting.id}?revisar=1`}
                      className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:border-brand/30"
                    >
                      <span className="truncate font-medium">{meeting.title}</span>
                      <ClipboardText size={16} className="shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Tarefas vencidas na semana"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link href={inboxHref({ filter: "overdue" })}>Ver inbox</Link>
              </Button>
            }
          >
            {data.overdueTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma tarefa atrasada nesta semana.</p>
            ) : (
              <ul className="space-y-2">
                {data.overdueTasks.map((task) => (
                  <li key={task.id} className="rounded-lg border px-3 py-2 text-sm">
                    <Link href={`/reunioes/${task.meeting_id}`} className="font-medium hover:underline">
                      {task.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {task.meetingTitle ?? "Reunião"} · vence {formatDueDate(task.due_date!)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Vencendo na próxima semana">
            {data.dueNextWeekTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nada com prazo na semana seguinte.</p>
            ) : (
              <ul className="space-y-2">
                {data.dueNextWeekTasks.map((task) => (
                  <li key={task.id} className="rounded-lg border px-3 py-2 text-sm">
                    <Link href={`/reunioes/${task.meeting_id}`} className="font-medium hover:underline">
                      {task.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {formatDueDate(task.due_date!)}
                      {task.assignee ? ` · ${task.assignee}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Decisões da semana">
            {data.topDecisions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma decisão registrada.</p>
            ) : (
              <ul className="space-y-2">
                {data.topDecisions.map((decision) => (
                  <li key={decision} className="flex gap-2 text-sm">
                    <Sparkle size={16} className="mt-0.5 shrink-0 text-brand" aria-hidden />
                    <span>{decision}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Próximas reuniões"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link href="/agenda">Ver agenda</Link>
              </Button>
            }
          >
            {data.upcomingMeetings.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma call agendada na semana seguinte.</p>
            ) : (
              <ul className="space-y-2">
                {data.upcomingMeetings.map((meeting) => (
                  <li key={meeting.id}>
                    <Link
                      href={`/reunioes/${meeting.id}`}
                      className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:border-brand/30"
                    >
                      <VideoCamera size={16} className="shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{meeting.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Intl.DateTimeFormat("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(meeting.started_at))}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {data.activeSeries.length > 0 && (
            <Panel
              title="Séries recorrentes"
              action={
                <Link href="/series" className="text-xs text-brand hover:underline">
                  Ver hub
                </Link>
              }
            >
              <ul className="space-y-2">
                {data.activeSeries.map((item) => (
                  <li key={item.recurringEventId}>
                    <Link
                      href={`/series/${encodeURIComponent(item.recurringEventId)}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 transition-colors hover:border-brand/40 hover:bg-brand/5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.meetingCount} ocorrências · {formatMeetingDateTime(item.lastStartedAt)}
                        </p>
                      </div>
                      <ArrowsClockwise size={16} className="shrink-0 text-brand" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title="Ações rápidas">
            <div className="flex flex-col gap-2">
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/revisar">
                  <ClipboardText size={16} className="mr-2" />
                  Fila de revisão
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href={inboxHref({ filter: "today" })}>
                  <CheckSquare size={16} className="mr-2" />
                  Tarefas de hoje
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/insights?period=7d">
                  <CheckCircle size={16} className="mr-2" />
                  Insights da semana
                </Link>
              </Button>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
