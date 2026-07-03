export const NOTIFICATION_KINDS = [
  "prep",
  "completed",
  "bot_failed",
  "tasks_due",
  "review_queue",
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const KIND_PREF_KEY: Record<
  NotificationKind,
  "prep" | "completed" | "bot_failed" | "tasks_due" | "review_queue"
> = {
  prep: "prep",
  completed: "completed",
  bot_failed: "bot_failed",
  tasks_due: "tasks_due",
  review_queue: "review_queue",
};

export const NOTIFICATION_KIND_LABELS: Record<NotificationKind, string> = {
  prep: "Prep de reunião",
  completed: "Reunião processada",
  bot_failed: "Falha do bot",
  tasks_due: "Tarefas do dia",
  review_queue: "Fila de revisão",
};
