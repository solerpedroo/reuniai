import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { Meeting } from "@/lib/supabase/types";
import { parseMeetingUrl } from "@/lib/meetings/meeting-url";
import { localeToVexaLanguage, parseUserLocale } from "@/lib/profile/locale";
import { buildBotDisplayName } from "@/lib/brand/bot-name";
import { applyBotBranding } from "@/lib/vexa/branding";
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
  meeting: Pick<
    Meeting,
    "id" | "user_id" | "meeting_url" | "platform" | "prefer_native_transcript" | "native_artifact_id"
  >
): Promise<StartBotResult> {
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

  try {
    await createBot({
      platform: parsed.platform,
      nativeMeetingId: parsed.nativeMeetingId,
      passcode: parsed.passcode,
      language,
      botName,
      voiceAgentEnabled: true,
    });
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "Falha ao criar bot." };
  }

  // Branding (câmera + fundo) em background — não bloqueia o join.
  void applyBotBranding(parsed.platform, parsed.nativeMeetingId).catch(() => {
    /* falha silenciosa; gravação segue sem branding visual */
  });

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
    .select("id, user_id, meeting_url, platform, prefer_native_transcript, native_artifact_id")
    .eq("status", "scheduled")
    .not("meeting_url", "is", null)
    .gte("started_at", lowerBound)
    .lte("started_at", upperBound);

  if (error) throw error;

  const rows = (meetings ?? []) as Array<
    Pick<
      Meeting,
      "id" | "user_id" | "meeting_url" | "platform" | "prefer_native_transcript" | "native_artifact_id"
    >
  >;
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
    if (result.ok) started += 1;
    else skipped += 1;
  }

  return { candidates: rows.length, started, skipped };
}
