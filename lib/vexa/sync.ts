import "server-only";

import type { Database } from "@/lib/supabase/database.types";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { MeetingStatus } from "@/lib/supabase/types";
import { notifyBotJoinFailed } from "@/lib/notifications/bot-failed";

type AdminClient = ReturnType<typeof createAdminClient>;
type MeetingUpdate = Database["public"]["Tables"]["meetings"]["Update"];

/** Traduz o status do Vexa para o enum interno de status de reunião. */
export function mapVexaStatus(vexaStatus: string): MeetingStatus | null {
  switch (vexaStatus) {
    case "requested":
    case "joining":
    case "awaiting_admission":
      return "bot_joining";
    case "active":
      return "recording";
    case "stopping":
      return "recording";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    default:
      return null;
  }
}

export type ApplyStatusInput = {
  nativeMeetingId: string;
  vexaStatus: string;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
};

/**
 * Atualiza a reunião correspondente (encontrada via `recall_bot_id`) com o novo
 * status do bot. Calcula `ended_at`/`duration_ms` quando a reunião termina.
 */
export async function applyMeetingStatus(
  admin: AdminClient,
  input: ApplyStatusInput
): Promise<{ updated: boolean }> {
  const nextStatus = mapVexaStatus(input.vexaStatus);
  if (!nextStatus) return { updated: false };

  const { data: meeting } = await admin
    .from("meetings")
    .select("id, user_id, title, started_at, status")
    .eq("recall_bot_id", input.nativeMeetingId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle<{
      id: string;
      user_id: string;
      title: string;
      started_at: string;
      status: MeetingStatus;
    }>();

  if (!meeting) return { updated: false };

  const patch: MeetingUpdate = { status: nextStatus };

  // Não regride de "gravando" para "entrando" por ruído de poll/webhook.
  if (meeting.status === "recording" && nextStatus === "bot_joining") {
    return { updated: false };
  }

  // Não regride de "processando" para estados anteriores.
  if (meeting.status === "processing" && (nextStatus === "bot_joining" || nextStatus === "recording")) {
    return { updated: false };
  }

  if (nextStatus === "completed") {
    const endIso = input.endTime ?? new Date().toISOString();
    patch.ended_at = endIso;
    const startMs = new Date(input.startTime ?? meeting.started_at).getTime();
    const endMs = new Date(endIso).getTime();
    if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs) {
      patch.duration_ms = endMs - startMs;
    }
  }

  if (nextStatus === "failed" && input.reason) {
    patch.error_message = input.reason;
  }

  await admin.from("meetings").update(patch).eq("id", meeting.id);

  if (nextStatus === "failed" && meeting.status !== "failed") {
    try {
      await notifyBotJoinFailed(admin, {
        userId: meeting.user_id,
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        reason: input.reason,
      });
    } catch (err) {
      console.error("Falha ao notificar bot failed (não bloqueante):", err);
    }
  }

  return { updated: true };
}
