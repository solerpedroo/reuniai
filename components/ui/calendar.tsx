"use client";

import { useEffect, useMemo, useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  formatCalendarMonthLabel,
  getCalendarMonthGrid,
  parseDateIso,
  shiftAgendaMonth,
} from "@/lib/agenda/types";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function Calendar({
  selectedIso,
  todayIso,
  timezone,
  onSelect,
  className,
}: {
  selectedIso: string;
  todayIso: string;
  timezone: string;
  onSelect: (dateIso: string) => void;
  className?: string;
}) {
  const [viewIso, setViewIso] = useState(selectedIso);

  useEffect(() => {
    setViewIso(selectedIso);
  }, [selectedIso]);

  const monthLabel = formatCalendarMonthLabel(viewIso, timezone);
  const cells = useMemo(() => getCalendarMonthGrid(viewIso), [viewIso]);

  function goToMonth(offset: number) {
    setViewIso((current) => shiftAgendaMonth(current, offset));
  }

  return (
    <div className={cn("w-[280px] select-none p-1", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => goToMonth(-1)}
          aria-label="Mês anterior"
        >
          <CaretLeft size={16} />
        </Button>
        <p className="text-sm font-semibold capitalize">{monthLabel}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => goToMonth(1)}
          aria-label="Próximo mês"
        >
          <CaretRight size={16} />
        </Button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label) => (
          <span
            key={label}
            className="py-1 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
          >
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const { day } = parseDateIso(cell.dateIso);
          const isSelected = cell.dateIso === selectedIso;
          const isToday = cell.dateIso === todayIso;

          return (
            <button
              key={cell.dateIso}
              type="button"
              onClick={() => onSelect(cell.dateIso)}
              className={cn(
                "flex size-9 items-center justify-center rounded-md text-sm tabular-nums transition-colors",
                "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                !cell.inMonth && "text-muted-foreground/45",
                cell.inMonth && "text-foreground",
                isToday && !isSelected && "font-semibold text-brand ring-1 ring-brand/25",
                isSelected && "bg-brand font-semibold text-brand-foreground hover:bg-brand/90"
              )}
              aria-label={cell.dateIso}
              aria-pressed={isSelected}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
