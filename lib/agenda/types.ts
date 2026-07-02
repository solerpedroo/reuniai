export function shiftAgendaDate(dateIso: string, days: number): string {
  const base = new Date(`${dateIso}T12:00:00`);
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

export function parseDateIso(dateIso: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateIso.split("-").map(Number);
  return { year: year!, month: month! - 1, day: day! };
}

export function buildDateIso(year: number, month: number, day: number): string {
  const date = new Date(year, month, day, 12, 0, 0, 0);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function shiftAgendaMonth(dateIso: string, months: number): string {
  const { year, month, day } = parseDateIso(dateIso);
  const date = new Date(year, month + months, 1, 12, 0, 0, 0);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return buildDateIso(date.getFullYear(), date.getMonth(), Math.min(day, lastDay));
}

export type CalendarDayCell = {
  dateIso: string;
  inMonth: boolean;
};

export function getCalendarMonthGrid(dateIso: string): CalendarDayCell[] {
  const { year, month } = parseDateIso(dateIso);
  const firstOfMonth = new Date(year, month, 1, 12, 0, 0, 0);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - startOffset, 12, 0, 0, 0);
  const cells: CalendarDayCell[] = [];

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    cells.push({
      dateIso: buildDateIso(date.getFullYear(), date.getMonth(), date.getDate()),
      inMonth: date.getMonth() === month,
    });
  }

  return cells;
}

export function formatAgendaDateLabel(
  dateIso: string,
  timezone: string,
  todayIso: string
): string {
  const tomorrow = shiftAgendaDate(todayIso, 1);
  const yesterday = shiftAgendaDate(todayIso, -1);

  if (dateIso === todayIso) return "Hoje";
  if (dateIso === tomorrow) return "Amanhã";
  if (dateIso === yesterday) return "Ontem";

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${dateIso}T12:00:00`));
}

export function formatAgendaPickerLabel(dateIso: string, timezone: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateIso}T12:00:00`));
}

export function formatCalendarMonthLabel(dateIso: string, timezone: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateIso}T12:00:00`));
}

export type AgendaEntryKind =
  | "scheduled_meeting"
  | "prep"
  | "review_pending"
  | "task_due";

export type AgendaSection = "now" | "later" | "done";

export type AgendaEntry = {
  id: string;
  kind: AgendaEntryKind;
  section: AgendaSection;
  sortAt: string;
  title: string;
  subtitle?: string;
  href: string;
  timeLabel: string;
};

export type DailyTimeline = {
  dateIso: string;
  timezone: string;
  todayIso: string;
  entries: AgendaEntry[];
};
