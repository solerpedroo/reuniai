import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyMeetingStatus } from "@/lib/vexa/sync";

export const dynamic = "force-dynamic";

type VexaWebhookPayload = {
  event_type?: string;
  meeting?: {
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

  if (payload.event_type === "meeting.status_change") {
    const vexaStatus = payload.status_change?.to ?? payload.meeting?.status;
    if (vexaStatus) {
      await applyMeetingStatus(admin, {
        nativeMeetingId,
        vexaStatus,
        startTime: payload.meeting?.start_time,
        endTime: payload.meeting?.end_time,
        reason: payload.status_change?.reason,
      });
    }
  }

  // recording.completed → ingestão de transcript/gravação será tratada na Onda 7.

  await admin
    .from("webhook_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("provider", "vexa")
    .eq("event_id", eventId);

  return NextResponse.json({ ok: true });
}
