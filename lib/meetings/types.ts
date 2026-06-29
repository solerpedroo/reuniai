import type { Meeting, MeetingPlatform, MeetingStatus } from "@/lib/supabase/types";

export const STATUS_LABELS: Record<MeetingStatus, string> = {
  scheduled: "Agendada",
  bot_joining: "Bot entrando",
  recording: "Gravando",
  processing: "Processando",
  completed: "Concluída",
  failed: "Falhou",
  cancelled: "Cancelada",
  partial: "Parcial",
};

/** Tom visual de cada status (classes Tailwind para badge com indicador). */
export const STATUS_TONES: Record<MeetingStatus, string> = {
  scheduled: "bg-muted text-muted-foreground",
  bot_joining: "bg-brand/10 text-brand",
  recording: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  processing: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  completed: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  failed: "bg-destructive/15 text-destructive",
  cancelled: "bg-muted text-muted-foreground line-through",
  partial: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

export const STATUS_DOT_TONES: Record<MeetingStatus, string> = {
  scheduled: "bg-muted-foreground/60",
  bot_joining: "bg-brand",
  recording: "bg-amber-500 animate-pulse",
  processing: "bg-blue-500 animate-pulse",
  completed: "bg-emerald-500",
  failed: "bg-destructive",
  cancelled: "bg-muted-foreground/60",
  partial: "bg-amber-500",
};

export const PLATFORM_LABELS: Record<MeetingPlatform, string> = {
  google_meet: "Google Meet",
  zoom: "Zoom",
  teams: "Microsoft Teams",
  other: "Outra",
};

export const MEETING_STATUSES = Object.keys(STATUS_LABELS) as MeetingStatus[];
export const MEETING_PLATFORMS = Object.keys(PLATFORM_LABELS) as MeetingPlatform[];

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

/** Ex.: "29 jun, 14:00" */
export function formatMeetingDate(iso: string): string {
  return dateFormatter.format(new Date(iso)).replace(".", "");
}

/** Ex.: "14:00" */
export function formatMeetingTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

/** Duração de uma reunião a partir de duration_ms ou do intervalo started/ended. */
export function getMeetingDurationMs(meeting: Pick<Meeting, "duration_ms" | "started_at" | "ended_at">): number | null {
  if (typeof meeting.duration_ms === "number") return meeting.duration_ms;
  if (meeting.ended_at) {
    return new Date(meeting.ended_at).getTime() - new Date(meeting.started_at).getTime();
  }
  return null;
}

/** Ex.: "1h 23m", "45m", "—" */
export function formatDuration(ms: number | null): string {
  if (ms == null || ms < 0) return "—";
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 1) return "<1m";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/** Formata horas a partir de milissegundos totais. Ex.: "8.5h" */
export function formatHours(ms: number): string {
  const hours = ms / 3_600_000;
  return `${hours.toFixed(1).replace(".0", "")}h`;
}

/** Diferença amigável para due dates. */
export function formatDueDate(date: string): { label: string; overdue: boolean } {
  const due = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000);

  if (diffDays < 0) return { label: `Atrasada ${Math.abs(diffDays)}d`, overdue: true };
  if (diffDays === 0) return { label: "Vence hoje", overdue: true };
  if (diffDays === 1) return { label: "Vence amanhã", overdue: false };
  if (diffDays <= 7) return { label: `Em ${diffDays}d`, overdue: false };

  return {
    label: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(due),
    overdue: false,
  };
}
