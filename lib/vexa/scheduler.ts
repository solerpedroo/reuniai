import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { Meeting } from "@/lib/supabase/types";
import { parseMeetingUrl } from "@/lib/meetings/meeting-url";
import { createBot } from "@/lib/vexa/client";

type AdminClient = ReturnType<typeof createAdminClient>;

/** Quanto tempo antes do início o bot tenta entrar. */
const LEAD_MINUTES = 5;
/** Janela de tolerância para reuniões que já começaram. */
const GRACE_MINUTES = 120;

export type StartBotResult =
  | { ok: true; nativeMeetingId: string }
  | { ok: false; reason: string };

export async function startBotForMeeting(
  admin: AdminClient,
  meeting: Pick<Meeting, "id" | "user_id" | "meeting_url">
): Promise<StartBotResult> {
  if (!meeting.meeting_url) {
    return { ok: false, reason: "Reunião sem link de vídeo." };
  }

  const parsed = parseMeetingUrl(meeting.meeting_url);
  if (!parsed) {
    return { ok: false, reason: "Plataforma não suportada ou link inválido." };
  }

  try {
    await createBot({
      platform: parsed.platform,
      nativeMeetingId: parsed.nativeMeetingId,
      passcode: parsed.passcode,
    });
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "Falha ao criar bot." };
  }

  const { error } = await admin
    .from("meetings")
    .update({ status: "bot_joining", recall_bot_id: parsed.nativeMeetingId, error_message: null })
    .eq("id", meeting.id);

  if (error) {
    return { ok: false, reason: "Bot criado, mas falhou ao atualizar a reunião." };
  }

  return { ok: true, nativeMeetingId: parsed.nativeMeetingId };
}

export type ScheduleSummary = {
  candidates: number;
  started: number;
  skipped: number;
};

export async function scheduleBotsForUpcomingMeetings(
  admin: AdminClient
): Promise<ScheduleSummary> {
  const now = Date.now();
  const lowerBound = new Date(now - GRACE_MINUTES * 60_000).toISOString();
  const upperBound = new Date(now + LEAD_MINUTES * 60_000).toISOString();

  const { data: meetings, error } = await admin
    .from("meetings")
    .select("id, user_id, meeting_url")
    .eq("status", "scheduled")
    .not("meeting_url", "is", null)
    .gte("started_at", lowerBound)
    .lte("started_at", upperBound);

  if (error) throw error;

  const rows = (meetings ?? []) as Array<Pick<Meeting, "id" | "user_id" | "meeting_url">>;
  if (rows.length === 0) return { candidates: 0, started: 0, skipped: 0 };

  // Apenas usuários com auto-join habilitado.
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, auto_join_enabled")
    .in("id", userIds)
    .eq("auto_join_enabled", true);

  const autoJoinUsers = new Set((profiles ?? []).map((p) => p.id));

  let started = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!autoJoinUsers.has(row.user_id)) {
      skipped += 1;
      continue;
    }

    const result = await startBotForMeeting(admin, row);
    if (result.ok) started += 1;
    else skipped += 1;
  }

  return { candidates: rows.length, started, skipped };
}
