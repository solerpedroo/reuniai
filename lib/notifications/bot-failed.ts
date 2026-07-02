import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/notifications/dispatch";
import {
  botFailedNotificationHref,
  notificationDedupeKey,
} from "@/lib/notifications/hrefs";

type AdminClient = ReturnType<typeof createAdminClient>;

const SILENT_BOT_FAILURE_PATTERNS = [
  "Bot já está ativo",
  "transcript nativo",
  "sem link de vídeo",
  "Aguardando transcript nativo",
] as const;

export function isActionableBotJoinFailure(reason: string): boolean {
  const normalized = reason.trim();
  if (!normalized) return false;
  return !SILENT_BOT_FAILURE_PATTERNS.some((pattern) => normalized.includes(pattern));
}

export async function notifyBotJoinFailed(
  admin: AdminClient,
  input: {
    userId: string;
    meetingId: string;
    meetingTitle: string;
    reason?: string | null;
  }
): Promise<void> {
  const detail = input.reason?.trim();
  const body = detail
    ? `O bot não entrou em "${input.meetingTitle}": ${detail}`
    : `O bot não conseguiu entrar em "${input.meetingTitle}".`;

  await notifyUser(admin, {
    userId: input.userId,
    kind: "bot_failed",
    title: "Bot não entrou na reunião",
    body,
    href: botFailedNotificationHref(input.meetingId),
    dedupeKey: notificationDedupeKey("bot_failed", [input.meetingId]),
  });
}
