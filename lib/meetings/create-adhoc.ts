import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { Meeting } from "@/lib/supabase/types";
import { previewMeetingUrlInput } from "@/lib/meetings/normalize-meeting-url";
import { formatMeetingTime } from "@/lib/meetings/types";
import { startBotForMeeting } from "@/lib/vexa/scheduler";

type AdminClient = ReturnType<typeof createAdminClient>;

export type CreateAdhocInput = {
  meetingUrl: string;
  title?: string;
  startBot?: boolean;
};

export type CreateAdhocResult =
  | {
      ok: true;
      meeting: Meeting;
      reused: boolean;
      botStarted: boolean;
      botError?: string;
    }
  | { ok: false; error: string };

const ACTIVE_STATUSES = ["scheduled", "bot_joining", "recording"] as const;
const DEFAULT_TIMEZONE = "America/Sao_Paulo";

async function resolveUserTimezone(admin: AdminClient, userId: string): Promise<string> {
  const { data: profile } = await admin
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .maybeSingle<{ timezone: string | null }>();

  return profile?.timezone ?? DEFAULT_TIMEZONE;
}

function defaultTitle(platformLabel: string, timezone: string): string {
  return `Reunião ${platformLabel} · ${formatMeetingTime(new Date().toISOString(), timezone)}`;
}

/** Cria reunião ad-hoc (fora do calendário) e opcionalmente envia o bot. */
export async function createAdhocMeeting(
  admin: AdminClient,
  userId: string,
  input: CreateAdhocInput
): Promise<CreateAdhocResult> {
  const preview = previewMeetingUrlInput(input.meetingUrl);
  if (!preview.normalizedUrl || !preview.botSupported || !preview.platform) {
    return { ok: false, error: preview.message };
  }

  const shouldStartBot = input.startBot !== false;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: existing } = await admin
    .from("meetings")
    .select("*")
    .eq("user_id", userId)
    .eq("meeting_url", preview.normalizedUrl)
    .in("status", [...ACTIVE_STATUSES])
    .gte("started_at", oneHourAgo)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle<Meeting>();

  if (existing) {
    let botStarted = false;
    let botError: string | undefined;

    if (shouldStartBot && existing.status === "scheduled") {
      const botResult = await startBotForMeeting(admin, existing);
      botStarted = botResult.ok;
      if (!botResult.ok) botError = botResult.reason;
    } else if (existing.status === "bot_joining" || existing.status === "recording") {
      botStarted = true;
    }

    return {
      ok: true,
      meeting: existing,
      reused: true,
      botStarted,
      botError,
    };
  }

  const title =
    input.title?.trim() ||
    defaultTitle(
      preview.platformLabel ?? preview.platform,
      await resolveUserTimezone(admin, userId)
    );

  const { data: meeting, error } = await admin
    .from("meetings")
    .insert({
      user_id: userId,
      title,
      meeting_url: preview.normalizedUrl,
      platform: preview.platform,
      started_at: new Date().toISOString(),
      status: "scheduled",
      calendar_event_id: null,
    })
    .select("*")
    .single<Meeting>();

  if (error || !meeting) {
    return { ok: false, error: "Falha ao criar a reunião." };
  }

  let botStarted = false;
  let botError: string | undefined;

  if (shouldStartBot) {
    const botResult = await startBotForMeeting(admin, meeting);
    botStarted = botResult.ok;
    if (!botResult.ok) botError = botResult.reason;
  }

  return {
    ok: true,
    meeting,
    reused: false,
    botStarted,
    botError,
  };
}
