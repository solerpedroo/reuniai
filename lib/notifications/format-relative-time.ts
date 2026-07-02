function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Ex.: "12:47", "Ontem", "seg", "28 jun" — sem "há X dias". */
export function formatNotificationTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();

  if (isSameDay(date, now)) {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, yesterday)) return "Ontem";

  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (diffDays < 7) {
    return new Intl.DateTimeFormat("pt-BR", { weekday: "short" })
      .format(date)
      .replace(".", "");
  }

  const options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  if (date.getFullYear() !== now.getFullYear()) options.year = "numeric";

  return new Intl.DateTimeFormat("pt-BR", options).format(date).replace(".", "");
}
