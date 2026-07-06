"use client";

import Link from "next/link";
import {
  CalendarBlank,
  CaretDown,
  CaretUp,
  CheckCircle,
  ChatsCircle,
  ClipboardText,
  UploadSimple,
} from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DailyBriefing } from "@/lib/briefing/daily-briefing";
import { UI_FEATURE_VISIBILITY } from "@/lib/ui/feature-visibility";
import { cn } from "@/lib/utils";

function formatCountdown(minutes: number): string {
  if (minutes <= 0) return "Agora";
  if (minutes < 60) return `Em ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `Em ${hours}h ${rest}min` : `Em ${hours}h`;
}

function formatTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function CollapsibleBlock({
  title,
  count,
  defaultOpen = true,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card>
      <CardHeader className="pb-2">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 text-left"
          onClick={() => setOpen((value) => !value)}
        >
          <CardTitle className="text-base">{title}</CardTitle>
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            {count != null ? count : null}
            {open ? <CaretUp size={16} /> : <CaretDown size={16} />}
          </span>
        </button>
      </CardHeader>
      {open ? <CardContent className="space-y-3">{children}</CardContent> : null}
    </Card>
  );
}

export function DailyBriefingView({ briefing }: { briefing: DailyBriefing }) {
  return (
    <div className="space-y-6">
      <section className="surface-card overflow-hidden p-6">
        <p className="text-sm capitalize text-muted-foreground">{briefing.dateLabel}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">
          {briefing.greeting}
        </h2>

        {briefing.isDayClear ? (
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
            <CheckCircle size={24} className="shrink-0 text-emerald-600" weight="fill" />
            <div>
              <p className="font-medium text-emerald-900 dark:text-emerald-100">
                Dia limpo — nada urgente na fila
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Aproveite para planejar a semana ou revisar insights.
              </p>
            </div>
          </div>
        ) : briefing.nextMeeting ? (
          <div className="mt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Próxima reunião
            </p>
            <Link
              href={briefing.nextMeeting.href}
              className="mt-2 block rounded-lg border border-brand/30 bg-brand/5 p-4 transition hover:bg-brand/10"
            >
              <p className="text-lg font-semibold">{briefing.nextMeeting.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatTime(briefing.nextMeeting.startedAt, briefing.timezone)} ·{" "}
                {formatCountdown(briefing.nextMeeting.minutesUntil)}
              </p>
            </Link>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/ensaiar">
              <ChatsCircle size={16} className="mr-1.5" />
              Ensaiar
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/importar">
              <UploadSimple size={16} className="mr-1.5" />
              Importar
            </Link>
          </Button>
          {briefing.reviewPending > 0 ? (
            <Button asChild size="sm" variant="outline">
              <Link href="/revisar">
                <ClipboardText size={16} className="mr-1.5" />
                Revisar ({briefing.reviewPending})
              </Link>
            </Button>
          ) : null}
        </div>
      </section>

      {briefing.prepCards.length > 0 ? (
        <CollapsibleBlock title="Prep do dia" count={briefing.prepCards.length}>
          {briefing.prepCards.map((prep) => (
            <Link
              key={prep.meetingId}
              href={prep.href}
              className="block rounded-md border border-border/70 p-3 hover:bg-muted/40"
            >
              <p className="font-medium">{prep.title}</p>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {prep.briefingPreview}
              </p>
            </Link>
          ))}
        </CollapsibleBlock>
      ) : null}

      {briefing.urgentTasks.length > 0 ? (
        <CollapsibleBlock title="Tarefas urgentes" count={briefing.urgentTasks.length}>
          <ul className="space-y-2">
            {briefing.urgentTasks.map((task) => (
              <li key={task.id}>
                <Link
                  href={task.href}
                  className="flex items-start justify-between gap-3 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-muted/40"
                >
                  <span>{task.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {task.meetingTitle}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </CollapsibleBlock>
      ) : null}

      {briefing.dueCommitments.length > 0 ? (
        <CollapsibleBlock title="Compromissos vencendo" count={briefing.dueCommitments.length}>
          <ul className="space-y-2">
            {briefing.dueCommitments.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="block rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-muted/40"
                >
                  <p>{item.text}</p>
                  {item.counterparty ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.counterparty}</p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </CollapsibleBlock>
      ) : null}

      <CollapsibleBlock
        title="Fila e calendário"
        defaultOpen={briefing.reviewPending > 0 || briefing.calendarLoadScore != null}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/revisar"
            className={cn(
              "rounded-md border p-3 hover:bg-muted/40",
              briefing.reviewPending > 0 && "border-amber-500/40 bg-amber-500/5"
            )}
          >
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <ClipboardText size={16} />
              Revisão pendente
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{briefing.reviewPending}</p>
          </Link>

          {UI_FEATURE_VISIBILITY.calendarIntegrations ? (
            <Link href="/calendario" className="rounded-md border p-3 hover:bg-muted/40">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <CalendarBlank size={16} />
                Carga da semana
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {briefing.calendarLoadScore != null ? `${briefing.calendarLoadScore}/100` : "—"}
              </p>
              {!briefing.calendarConnected ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Conecte o calendário para análise completa
                </p>
              ) : null}
            </Link>
          ) : null}
        </div>
      </CollapsibleBlock>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/agenda" className="text-brand hover:underline">
          Agenda do dia
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/planejar" className="text-brand hover:underline">
          Planejar semana
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/impacto" className="text-brand hover:underline">
          Impacto
        </Link>
      </div>
    </div>
  );
}
