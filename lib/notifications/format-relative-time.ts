/** Ex.: "Agora", "Há 2h", "Ontem", "12 mar" */
export function formatNotificationRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);

  if (diffSec < 60) return "Agora";

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Há ${diffMin} min`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `Há ${diffHr}h`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "Ontem";
  if (diffDay < 7) return `Há ${diffDay} dias`;

  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" })
    .format(date)
    .replace(".", "");
}
