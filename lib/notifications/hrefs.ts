import "server-only";

import type { NotificationKind } from "@/lib/notifications/kinds";

export function meetingDetailHref(meetingId: string): string {
  return `/reunioes/${meetingId}`;
}

export function prepNotificationHref(meetingId: string): string {
  return `/reunioes/${meetingId}?prep=1`;
}

export function completedNotificationHref(meetingId: string, queuePending?: number): string {
  if (queuePending != null && queuePending > 1) {
    return "/revisar";
  }
  return `/reunioes/${meetingId}?revisar=1`;
}

export function botFailedNotificationHref(meetingId: string): string {
  return `/reunioes/${meetingId}`;
}

export function tasksDueNotificationHref(): string {
  return "/tarefas";
}

export function reviewQueueNotificationHref(): string {
  return "/revisar";
}

export function notificationDedupeKey(
  kind: NotificationKind,
  parts: string[]
): string {
  return [kind, ...parts].join(":");
}
