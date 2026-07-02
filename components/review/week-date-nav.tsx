"use client";

import { useRouter } from "next/navigation";
import { CalendarBlank, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { shiftWeekKey, weekHref } from "@/lib/review/week-utils";

export function WeekDateNav({
  weekKey,
  weekLabel,
  isCurrentWeek,
}: {
  weekKey: string;
  weekLabel: string;
  isCurrentWeek: boolean;
}) {
  const router = useRouter();
  const prevWeek = shiftWeekKey(weekKey, -1);
  const nextWeek = shiftWeekKey(weekKey, 1);

  return (
    <div className="surface-toolbar flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Revisão semanal</p>
        <h2 className="truncate text-xl font-semibold capitalize">{weekLabel}</h2>
        <p className="text-xs text-muted-foreground">{weekKey.replace("-", " · ")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={isCurrentWeek ? "secondary" : "outline"}
          size="sm"
          disabled={isCurrentWeek}
          onClick={() => router.push("/semana")}
        >
          Esta semana
        </Button>

        <Button type="button" variant="outline" size="sm" className="gap-2" disabled>
          <CalendarBlank size={16} aria-hidden />
          Semana
        </Button>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => router.push(weekHref(prevWeek))}
            aria-label="Semana anterior"
          >
            <CaretLeft size={16} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => router.push(weekHref(nextWeek))}
            aria-label="Próxima semana"
          >
            <CaretRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
