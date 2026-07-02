"use client";

import Link from "next/link";
import {
  CalendarBlank,
  CheckSquare,
  Sparkle,
  VideoCamera,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { AgendaDateNav } from "@/components/agenda/agenda-date-nav";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import type { AgendaEntry, AgendaSection, DailyTimeline } from "@/lib/agenda/types";
import { cn } from "@/lib/utils";

const SECTION_LABELS: Record<AgendaSection, string> = {
  now: "Agora",
  later: "Depois",
  done: "Concluído",
};

const KIND_META: Record<
  AgendaEntry["kind"],
  { icon: Icon; accent: string; action: string }
> = {
  scheduled_meeting: {
    icon: VideoCamera,
    accent: "border-brand/25 bg-brand/5",
    action: "Ver reunião",
  },
  prep: {
    icon: Sparkle,
    accent: "border-violet-500/25 bg-violet-500/5",
    action: "Ver prep",
  },
  review_pending: {
    icon: CalendarBlank,
    accent: "border-amber-500/25 bg-amber-500/5",
    action: "Ver fila",
  },
  task_due: {
    icon: CheckSquare,
    accent: "border-emerald-500/25 bg-emerald-500/5",
    action: "Ver tarefas",
  },
};

function groupBySection(entries: AgendaEntry[]): Map<AgendaSection, AgendaEntry[]> {
  const map = new Map<AgendaSection, AgendaEntry[]>([
    ["now", []],
    ["later", []],
    ["done", []],
  ]);

  for (const entry of entries) {
    map.get(entry.section)?.push(entry);
  }

  return map;
}

export function DailyAgendaView({ timeline }: { timeline: DailyTimeline }) {
  const grouped = groupBySection(timeline.entries);

  return (
    <div className="space-y-6">
      <AgendaDateNav
        dateIso={timeline.dateIso}
        todayIso={timeline.todayIso}
        timezone={timeline.timezone}
      />

      {timeline.entries.length === 0 ? (
        <EmptyState
          icon={CalendarBlank}
          tone="brand"
          title="Dia livre"
          description="Nenhuma reunião, prep ou tarefa urgente para este dia."
        >
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/reunioes">Ver reuniões</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/tarefas">Ver tarefas</Link>
            </Button>
          </div>
        </EmptyState>
      ) : (
        (["now", "later", "done"] as AgendaSection[]).map((section) => {
          const items = grouped.get(section) ?? [];
          if (items.length === 0) return null;

          return (
            <section key={section} className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">
                {SECTION_LABELS[section]}
              </h3>
              <ul className="space-y-3">
                {items.map((entry) => {
                  const meta = KIND_META[entry.kind];
                  const Icon = meta.icon;
                  return (
                    <li
                      key={entry.id}
                      className={cn(
                        "flex min-h-[44px] flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between",
                        meta.accent
                      )}
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-background/80">
                          <Icon size={18} className="text-foreground" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium tabular-nums text-muted-foreground">
                            {entry.timeLabel}
                          </p>
                          <p className="truncate text-sm font-semibold">{entry.title}</p>
                          {entry.subtitle && (
                            <p className="truncate text-xs text-muted-foreground">
                              {entry.subtitle}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="shrink-0" asChild>
                        <Link href={entry.href}>{meta.action}</Link>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
