import "server-only";

import type { NotificationKind } from "@/lib/notifications/kinds";

export function meetingDetailHref(meetingId: string): string {
  return `/reunioes/${meetingId}`;
}

export function prepNotificationHref(meetingId: string): string {
  return `/reunioes/${meetingId}?prep=1`;
}

export function completedNotificationHref(meetingId: string): string {
  return `/reunioes/${meetingId}?revisar=1`;
}

export function botFailedNotificationHref(meetingId: string): string {
  return `/reunioes/${meetingId}`;
}

export function tasksDueNotificationHref(): string {
  return "/tarefas?filtro=today";
}

export function notificationDedupeKey(
  kind: NotificationKind,
  parts: string[]
): string {
  return [kind, ...parts].join(":");
}
