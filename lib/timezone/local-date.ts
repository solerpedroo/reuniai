import "server-only";

const DEFAULT_TIMEZONE = "America/Sao_Paulo";

export function resolveTimezone(timezone: string | null | undefined): string {
  if (!timezone?.trim()) return DEFAULT_TIMEZONE;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return timezone;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

/** YYYY-MM-DD na timezone do usuário. */
export function localDateIsoInTimezone(timezone: string, date = new Date()): string {
  const tz = resolveTimezone(timezone);
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(date);
}

export function localHourInTimezone(timezone: string, date = new Date()): number {
  const tz = resolveTimezone(timezone);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    hour12: false,
  }).formatToParts(date);
  return Number.parseInt(parts.find((p) => p.type === "hour")?.value ?? "-1", 10);
}

export function isLocalHourInTimezone(
  timezone: string,
  targetHour: number,
  date = new Date()
): boolean {
  return localHourInTimezone(timezone, date) === targetHour;
}

export function isSameLocalCalendarDay(
  a: Date,
  b: Date,
  timezone: string
): boolean {
  const tz = resolveTimezone(timezone);
  return localDateIsoInTimezone(tz, a) === localDateIsoInTimezone(tz, b);
}
