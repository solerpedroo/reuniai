"use client";

import { useMemo } from "react";
import { CalendarBlank, Clock, X } from "@phosphor-icons/react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatAgendaPickerLabel } from "@/lib/agenda/types";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, index) => index);
const MINUTES = Array.from({ length: 12 }, (_, index) => index * 5);

type ParsedDateTime = {
  dateIso: string;
  hour: number;
  minute: number;
};

function getClientTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function getTodayIso(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
}

function parseDateTimeLocal(value: string): ParsedDateTime | null {
  if (!value) return null;
  const [dateIso, timePart] = value.split("T");
  if (!dateIso || !timePart) return null;
  const [hourRaw, minuteRaw] = timePart.split(":").map(Number);
  if (Number.isNaN(hourRaw) || Number.isNaN(minuteRaw)) return null;
  const minute = MINUTES.reduce((closest, step) =>
    Math.abs(step - minuteRaw) < Math.abs(closest - minuteRaw) ? step : closest
  );
  return { dateIso, hour: hourRaw, minute };
}

function buildDateTimeLocal(dateIso: string, hour: number, minute: number): string {
  return `${dateIso}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatTimeLabel(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

type DateTimePickerProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  clearable?: boolean;
  disabled?: boolean;
};

/** Seletor de data (calendário) e hora (selects) alinhado ao design system. */
export function DateTimePicker({
  id,
  value,
  onChange,
  className,
  clearable = false,
  disabled = false,
}: DateTimePickerProps) {
  const timezone = useMemo(getClientTimezone, []);
  const todayIso = useMemo(() => getTodayIso(timezone), [timezone]);
  const parsed = parseDateTimeLocal(value);

  function update(next: Partial<ParsedDateTime>) {
    const dateIso = next.dateIso ?? parsed?.dateIso ?? todayIso;
    const hour = next.hour ?? parsed?.hour ?? 12;
    const minute = next.minute ?? parsed?.minute ?? 0;
    onChange(buildDateTimeLocal(dateIso, hour, minute));
  }

  function handleClear() {
    onChange("");
  }

  const dateLabel = parsed
    ? formatAgendaPickerLabel(parsed.dateIso, timezone)
    : "Selecionar data";
  const timeLabel = parsed ? formatTimeLabel(parsed.hour, parsed.minute) : null;

  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start gap-2 font-normal capitalize sm:flex-1",
              !parsed && "text-muted-foreground"
            )}
          >
            <CalendarBlank size={16} className="shrink-0 opacity-70" aria-hidden />
            {dateLabel}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="p-2">
          <Calendar
            selectedIso={parsed?.dateIso ?? todayIso}
            todayIso={todayIso}
            timezone={timezone}
            onSelect={(dateIso) => update({ dateIso })}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex items-center gap-2">
        <Clock size={16} className="hidden shrink-0 text-muted-foreground sm:block" aria-hidden />

        <Select
          value={parsed ? String(parsed.hour) : undefined}
          onValueChange={(hour) => update({ hour: Number(hour) })}
          disabled={disabled}
        >
          <SelectTrigger className="w-[4.5rem]" aria-label="Hora">
            <SelectValue placeholder="Hora" />
          </SelectTrigger>
          <SelectContent>
            {HOURS.map((hour) => (
              <SelectItem key={hour} value={String(hour)}>
                {String(hour).padStart(2, "0")}h
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground" aria-hidden>
          :
        </span>

        <Select
          value={parsed ? String(parsed.minute) : undefined}
          onValueChange={(minute) => update({ minute: Number(minute) })}
          disabled={disabled}
        >
          <SelectTrigger className="w-[4.5rem]" aria-label="Minuto">
            <SelectValue placeholder="Min" />
          </SelectTrigger>
          <SelectContent>
            {MINUTES.map((minute) => (
              <SelectItem key={minute} value={String(minute)}>
                {String(minute).padStart(2, "0")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {timeLabel && (
          <span className="sr-only">Horário selecionado: {timeLabel}</span>
        )}

        {clearable && parsed && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 text-muted-foreground"
            onClick={handleClear}
            disabled={disabled}
            aria-label="Limpar data e hora"
          >
            <X size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}
