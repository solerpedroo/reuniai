export type TimezoneOption = {
  value: string;
  label: string;
};

/** Fusos mais usados por usuários do ReuniAI (Brasil + internacional). */
export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  { value: "America/Sao_Paulo", label: "Brasília (GMT-3)" },
  { value: "America/Manaus", label: "Manaus (GMT-4)" },
  { value: "America/Fortaleza", label: "Fortaleza (GMT-3)" },
  { value: "America/Recife", label: "Recife (GMT-3)" },
  { value: "America/Cuiaba", label: "Cuiabá (GMT-4)" },
  { value: "America/Rio_Branco", label: "Rio Branco (GMT-5)" },
  { value: "America/Noronha", label: "Fernando de Noronha (GMT-2)" },
  { value: "America/New_York", label: "Nova York (GMT-5/-4)" },
  { value: "America/Chicago", label: "Chicago (GMT-6/-5)" },
  { value: "America/Los_Angeles", label: "Los Angeles (GMT-8/-7)" },
  { value: "Europe/Lisbon", label: "Lisboa (GMT+0/+1)" },
  { value: "Europe/London", label: "Londres (GMT+0/+1)" },
  { value: "Europe/Madrid", label: "Madrid (GMT+1/+2)" },
  { value: "UTC", label: "UTC" },
];

export function getDefaultTimezone(): string {
  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (TIMEZONE_OPTIONS.some((tz) => tz.value === detected)) return detected;
    return detected || "America/Sao_Paulo";
  } catch {
    return "America/Sao_Paulo";
  }
}

export function getTimezoneLabel(value: string): string {
  return TIMEZONE_OPTIONS.find((tz) => tz.value === value)?.label ?? value;
}
