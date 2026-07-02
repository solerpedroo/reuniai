"use client";

import { useRouter } from "next/navigation";
import { CalendarBlank, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  formatAgendaDateLabel,
  formatAgendaPickerLabel,
  shiftAgendaDate,
} from "@/lib/agenda/types";

export function AgendaDateNav({
  dateIso,
  todayIso,
  timezone,
}: {
  dateIso: string;
  todayIso: string;
  timezone: string;
}) {
  const router = useRouter();
  const isToday = dateIso === todayIso;
  const dateLabel = formatAgendaDateLabel(dateIso, timezone, todayIso);
  const pickerLabel = formatAgendaPickerLabel(dateIso, timezone);
  const prevDate = shiftAgendaDate(dateIso, -1);
  const nextDate = shiftAgendaDate(dateIso, 1);

  function navigate(targetIso: string) {
    if (targetIso === todayIso) {
      router.push("/agenda");
      return;
    }
    router.push(`/agenda?data=${targetIso}`);
  }

  return (
    <div className="surface-toolbar flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Agenda</p>
        <h2 className="truncate text-xl font-semibold capitalize">{dateLabel}</h2>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={isToday ? "secondary" : "outline"}
          size="sm"
          disabled={isToday}
          onClick={() => navigate(todayIso)}
        >
          Hoje
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 capitalize">
              <CalendarBlank size={16} aria-hidden />
              {pickerLabel}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="p-2">
            <Calendar
              selectedIso={dateIso}
              todayIso={todayIso}
              timezone={timezone}
              onSelect={(targetIso) => navigate(targetIso)}
            />
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => navigate(prevDate)}
            aria-label="Dia anterior"
          >
            <CaretLeft size={16} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => navigate(nextDate)}
            aria-label="Próximo dia"
          >
            <CaretRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
