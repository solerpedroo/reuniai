const DEFAULT_TIMEZONE = "America/Sao_Paulo";

function resolveTimezone(timezone: string | null | undefined): string {
  if (!timezone?.trim()) return DEFAULT_TIMEZONE;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return timezone;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export function startOfWeekMonday(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function isoWeekKeyFromDate(date: Date): string {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const week = 1 + Math.ceil((firstThursday - target.valueOf()) / 604_800_000);
  return `${target.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function parseWeekKey(value: string | undefined, timezone: string, now = new Date()): string {
  if (value && /^\d{4}-W\d{2}$/.test(value)) return value;
  return isoWeekKeyFromDate(now);
}

export function weekRangeFromKey(weekKey: string): { start: Date; end: Date } {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekKey);
  if (!match) throw new Error("Semana inválida");

  const year = Number.parseInt(match[1]!, 10);
  const week = Number.parseInt(match[2]!, 10);

  const jan4 = new Date(year, 0, 4);
  const start = startOfWeekMonday(jan4);
  start.setDate(start.getDate() + (week - 1) * 7);

  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  return { start, end };
}

export function shiftWeekKey(weekKey: string, weeks: number): string {
  const { start } = weekRangeFromKey(weekKey);
  const shifted = new Date(start);
  shifted.setDate(shifted.getDate() + weeks * 7);
  return isoWeekKeyFromDate(shifted);
}

export function isCurrentWeekKey(weekKey: string, _timezone: string, now = new Date()): boolean {
  return weekKey === isoWeekKeyFromDate(now);
}

export function formatWeekRangeLabel(weekKey: string, timezone: string): string {
  const tz = resolveTimezone(timezone);
  const { start, end } = weekRangeFromKey(weekKey);
  const endDisplay = new Date(end);
  endDisplay.setDate(endDisplay.getDate() - 1);

  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: tz,
    day: "2-digit",
    month: "short",
  });

  return `${formatter.format(start)} – ${formatter.format(endDisplay)}`;
}

export function weekHref(weekKey: string): string {
  const current = isoWeekKeyFromDate(new Date());
  if (weekKey === current) return "/semana";
  return `/semana?semana=${encodeURIComponent(weekKey)}`;
}

export function localDateIsoInTimezone(date: Date, timezone: string): string {
  const tz = resolveTimezone(timezone);
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(date);
}
