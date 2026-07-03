import { NextResponse, type NextRequest } from "next/server";
import { logStructured } from "@/lib/logging/structured";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BotPlatform } from "@/lib/meetings/meeting-url";
import { processMeetingByNativeId } from "@/lib/pipeline/process-meeting";
import { applyBotBranding } from "@/lib/vexa/branding";
import { applyMeetingStatus } from "@/lib/vexa/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BOT_PLATFORMS: BotPlatform[] = ["google_meet", "teams", "zoom"];

type VexaWebhookPayload = {
  event_type?: string;
  meeting?: {
    platform?: string;
    native_meeting_id?: string;
    status?: string;
    start_time?: string | null;
    end_time?: string | null;
    updated_at?: string | null;
  };
  status_change?: {
    from?: string;
    to?: string;
    reason?: string | null;
    timestamp?: string;
  };
};

export async function POST(request: NextRequest) {
  const secret = process.env.VEXA_WEBHOOK_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    logStructured("warn", "vexa.webhook.unauthorized");
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let payload: VexaWebhookPayload;
  try {
    payload = await request.json();
  } catch {
    logStructured("warn", "vexa.webhook.invalid_json");
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const nativeMeetingId = payload.meeting?.native_meeting_id;
  if (!nativeMeetingId) {
    logStructured("info", "vexa.webhook.ignored", { reason: "sem native_meeting_id" });
    return NextResponse.json({ ok: true, ignored: "sem native_meeting_id" });
  }

  logStructured("info", "vexa.webhook.received", {
    eventType: payload.event_type,
    nativeMeetingId,
    status: payload.status_change?.to ?? payload.meeting?.status,
  });

  const admin = createAdminClient();

  // Idempotência: dedupe por (provider, event_id).
  const eventId = [
    payload.event_type ?? "unknown",
    nativeMeetingId,
    payload.status_change?.to ?? payload.meeting?.status ?? "",
    payload.status_change?.timestamp ?? payload.meeting?.updated_at ?? "",
  ].join(":");

  const { error: insertError } = await admin
    .from("webhook_events")
    .insert({ provider: "vexa", event_id: eventId, payload: payload as never });

  if (insertError) {
    logStructured("info", "vexa.webhook.duplicate", { eventId });
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const vexaStatus = payload.status_change?.to ?? payload.meeting?.status;
  const platform = resolvePlatform(payload.meeting?.platform);

  if (payload.event_type === "meeting.status_change" && vexaStatus) {
    await applyMeetingStatus(admin, {
      nativeMeetingId,
      vexaStatus,
      startTime: payload.meeting?.start_time,
      endTime: payload.meeting?.end_time,
      reason: payload.status_change?.reason,
    });

    // Bot admitido → aplica câmera (aguarda concluir; maxDuration=60).
    if (vexaStatus === "active" && platform) {
      const branding = await applyBotBranding(platform, nativeMeetingId, { skipWait: true });
      if (!branding.avatar) {
        logStructured("warn", "bot.branding.failed", {
          platform,
          nativeMeetingId,
          avatar: branding.avatar,
          screen: branding.screen,
          errors: branding.errors.join(" | "),
        });
      }
    }
  }

  // Reunião finalizada ou gravação pronta → ingerir transcrição (Onda 7).
  const shouldIngest =
    payload.event_type === "recording.completed" || vexaStatus === "completed";

  if (shouldIngest) {
    if (platform) {
      try {
        await processMeetingByNativeId(admin, platform, nativeMeetingId);
      } catch (err) {
        logStructured("error", "vexa.webhook.process_failed", {
          nativeMeetingId,
          platform,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  await admin
    .from("webhook_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("provider", "vexa")
    .eq("event_id", eventId);

  logStructured("info", "vexa.webhook.processed", { eventId, nativeMeetingId });

  return NextResponse.json({ ok: true });
}

function resolvePlatform(value: string | undefined): BotPlatform | null {
  return value && BOT_PLATFORMS.includes(value as BotPlatform)
    ? (value as BotPlatform)
    : null;
}
