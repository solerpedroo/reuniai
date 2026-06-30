import { NextResponse, type NextRequest } from "next/server";
import { logStructured } from "@/lib/logging/structured";
import { processMeetingWithFallback } from "@/lib/pipeline/process-meeting";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type GraphNotification = {
  value?: {
    subscriptionId?: string;
    clientState?: string;
    resource?: string;
    changeType?: string;
  }[];
};

/**
 * Webhook Microsoft Graph para transcripts Teams (bring your own recording).
 * Validação: GET/POST com validationToken.
 */
export async function GET(request: NextRequest) {
  const validationToken = request.nextUrl.searchParams.get("validationToken");
  if (validationToken) {
    return new NextResponse(validationToken, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  const validationToken = request.nextUrl.searchParams.get("validationToken");
  if (validationToken) {
    return new NextResponse(validationToken, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const expectedState = process.env.MICROSOFT_WEBHOOK_CLIENT_STATE;
  const secret = process.env.MICROSOFT_WEBHOOK_SECRET;
  if (secret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
  }

  let payload: GraphNotification;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const admin = createAdminClient();

  for (const notification of payload.value ?? []) {
    if (expectedState && notification.clientState !== expectedState) {
      logStructured("warn", "microsoft.webhook.bad_client_state");
      continue;
    }

    const resource = notification.resource ?? "";
    const meetingMatch = resource.match(/onlineMeetings\/([^/]+)\/transcripts/i);
    if (!meetingMatch) continue;

    const onlineMeetingId = meetingMatch[1];
    const eventId = [
      notification.subscriptionId ?? "sub",
      onlineMeetingId,
      notification.changeType ?? "updated",
    ].join(":");

    const { error: insertError } = await admin.from("webhook_events").insert({
      provider: "microsoft",
      event_id: eventId,
      payload: notification as never,
    });

    if (insertError) {
      logStructured("info", "microsoft.webhook.duplicate", { eventId });
      continue;
    }

    const { data: meeting } = await admin
      .from("meetings")
      .select("id")
      .eq("native_artifact_id", onlineMeetingId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (meeting) {
      try {
        await processMeetingWithFallback(admin, meeting.id);
      } catch (err) {
        logStructured("error", "microsoft.webhook.process_failed", {
          meetingId: meeting.id,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    await admin
      .from("webhook_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("provider", "microsoft")
      .eq("event_id", eventId);
  }

  return NextResponse.json({ ok: true });
}
