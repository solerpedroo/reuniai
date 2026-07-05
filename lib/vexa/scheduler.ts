import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { Meeting } from "@/lib/supabase/types";
import { parseMeetingUrl } from "@/lib/meetings/meeting-url";
import { localeToVexaLanguage, parseUserLocale } from "@/lib/profile/locale";
import { buildBotDisplayName } from "@/lib/brand/bot-name";
import { after } from "next/server";
import { applyBotBranding } from "@/lib/vexa/branding";
import { createBot } from "@/lib/vexa/client";
import { mapVexaStatus } from "@/lib/vexa/sync";
import {
  isActionableBotJoinFailure,
  notifyBotJoinFailed,
} from "@/lib/notifications/bot-failed";

type AdminClient = ReturnType<typeof createAdminClient>;

type StartBotMeeting = Pick<
  Meeting,
  | "id"
  | "user_id"
  | "meeting_url"
  | "platform"
  | "status"
  | "prefer_native_transcript"
  | "native_artifact_id"
  | "calendar_event_id"
>;

type ScheduleBotRow = StartBotMeeting & Pick<Meeting, "title">;

/** Marca início da sessão ao vivo no despacho do bot (auto-saída e contagem). */
function shouldMarkBotSessionStart(meeting: Pick<Meeting, "calendar_event_id" | "status">): boolean {
  return (
    !meeting.calendar_event_id ||
    meeting.status === "scheduled" ||
    meeting.status === "failed"
  );
}

/** Quanto tempo antes do início o bot tenta entrar. */
const LEAD_MINUTES = 5;
/** Janela de tolerância para reuniões que já começaram. */
const GRACE_MINUTES = 120;

export type StartBotResult =
  | { ok: true; nativeMeetingId: string }
  | { ok: false; reason: string };

export async function startBotForMeeting(
  admin: AdminClient,
  meeting: StartBotMeeting
): Promise<StartBotResult> {
  if (["bot_joining", "recording", "processing"].includes(meeting.status)) {
    return { ok: false, reason: "Bot já está ativo ou em processamento nesta reunião." };
  }
  if (meeting.prefer_native_transcript) {
    return {
      ok: false,
      reason: "Reunião configurada para transcript nativo (sem bot).",
    };
  }

  if (meeting.platform === "teams" && meeting.native_artifact_id) {
    await admin
      .from("meetings")
      .update({ status: "recording", prefer_native_transcript: true })
      .eq("id", meeting.id);
    return {
      ok: false,
      reason: "Aguardando transcript nativo do Teams via Outlook.",
    };
  }

  if (!meeting.meeting_url) {
    return { ok: false, reason: "Reunião sem link de vídeo." };
  }

  const parsed = parseMeetingUrl(meeting.meeting_url);
  if (!parsed) {
    return { ok: false, reason: "Plataforma não suportada ou link inválido." };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("locale, display_name")
    .eq("id", meeting.user_id)
    .maybeSingle();

  const typedProfile = profile as { locale?: string; display_name?: string | null } | null;
  const language = localeToVexaLanguage(parseUserLocale(typedProfile?.locale));

  const { data: authUser } = await admin.auth.admin.getUserById(meeting.user_id);
  const metadata = authUser.user?.user_metadata as { full_name?: string; name?: string } | undefined;
  const botName = buildBotDisplayName({
    displayName: typedProfile?.display_name,
    email: authUser.user?.email,
    metadataFullName: metadata?.full_name ?? metadata?.name,
  });

  let vexaMeeting;
  try {
    vexaMeeting = await createBot({
      platform: parsed.platform,
      nativeMeetingId: parsed.meetingUrl ? undefined : parsed.nativeMeetingId,
      meetingUrl: parsed.meetingUrl,
      passcode: parsed.passcode,
      language,
      botName,
      voiceAgentEnabled: true,
      cameraEnabled: parsed.platform === "google_meet" || parsed.platform === "zoom",
    });
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "Falha ao criar bot." };
  }

  const resolvedNativeId = vexaMeeting.native_meeting_id || parsed.nativeMeetingId;
  const initialStatus = mapVexaStatus(vexaMeeting.status) ?? "bot_joining";

  // Branding (câmera) via after() — Vercel mantém a função viva após a resposta HTTP.
  after(async () => {
    const result = await applyBotBranding(parsed.platform, resolvedNativeId);
    if (result.errors.length > 0 || !result.avatar) {
      console.warn(
        `[bot-branding] ${parsed.platform}/${resolvedNativeId}: avatar=${result.avatar} screen=${result.screen} — ${result.errors.join(" | ") || "câmera não aplicada"}`
      );
    }
  });

  const { error } = await admin
    .from("meetings")
    .update({
      status: initialStatus,
      recall_bot_id: resolvedNativeId,
      error_message: null,
      ...(shouldMarkBotSessionStart(meeting)
        ? { started_at: new Date().toISOString() }
        : {}),
    })
    .eq("id", meeting.id);

  if (error) {
    return { ok: false, reason: "Bot criado, mas falhou ao atualizar a reunião." };
  }

  return { ok: true, nativeMeetingId: resolvedNativeId };
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
    .select(
      "id, user_id, title, meeting_url, status, platform, prefer_native_transcript, native_artifact_id, calendar_event_id"
    )
    .eq("status", "scheduled")
    .not("meeting_url", "is", null)
    .gte("started_at", lowerBound)
    .lte("started_at", upperBound);

  if (error) throw error;

  const rows = (meetings ?? []) as ScheduleBotRow[];
  if (rows.length === 0) return { candidates: 0, started: 0, skipped: 0 };

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
    if (result.ok) {
      started += 1;
    } else {
      skipped += 1;
      if (isActionableBotJoinFailure(result.reason)) {
        try {
          await notifyBotJoinFailed(admin, {
            userId: row.user_id,
            meetingId: row.id,
            meetingTitle: row.title,
            reason: result.reason,
          });
        } catch (err) {
          console.error("Falha ao notificar auto-join (não bloqueante):", err);
        }
      }
    }
  }

  return { candidates: rows.length, started, skipped };
}
