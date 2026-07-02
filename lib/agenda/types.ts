export function shiftAgendaDate(dateIso: string, days: number): string {
  const base = new Date(`${dateIso}T12:00:00`);
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
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
