import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BotPlatform } from "@/lib/meetings/meeting-url";
import { ingestByNativeId } from "@/lib/pipeline/ingest-transcript";
import { applyMeetingStatus } from "@/lib/vexa/sync";

export const dynamic = "force-dynamic";

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
  if (secret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
  }

  let payload: VexaWebhookPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const nativeMeetingId = payload.meeting?.native_meeting_id;
  if (!nativeMeetingId) {
    return NextResponse.json({ ok: true, ignored: "sem native_meeting_id" });
  }

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
    // Violação de unicidade = evento repetido; responder 200 para não gerar retries.
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const vexaStatus = payload.status_change?.to ?? payload.meeting?.status;

  if (payload.event_type === "meeting.status_change" && vexaStatus) {
    await applyMeetingStatus(admin, {
      nativeMeetingId,
      vexaStatus,
      startTime: payload.meeting?.start_time,
      endTime: payload.meeting?.end_time,
      reason: payload.status_change?.reason,
    });
  }

  // Reunião finalizada ou gravação pronta → ingerir transcrição (Onda 7).
  const shouldIngest =
    payload.event_type === "recording.completed" || vexaStatus === "completed";

  if (shouldIngest) {
    const platform = resolvePlatform(payload.meeting?.platform);
    if (platform) {
      try {
        await ingestByNativeId(admin, platform, nativeMeetingId);
      } catch (err) {
        console.error("Falha ao ingerir transcrição (webhook):", err);
      }
    }
  }

  await admin
    .from("webhook_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("provider", "vexa")
    .eq("event_id", eventId);

  return NextResponse.json({ ok: true });
}

function resolvePlatform(value: string | undefined): BotPlatform | null {
  return value && BOT_PLATFORMS.includes(value as BotPlatform)
    ? (value as BotPlatform)
    : null;
}
