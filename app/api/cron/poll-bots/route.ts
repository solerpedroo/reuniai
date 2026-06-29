import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseMeetingUrl } from "@/lib/meetings/meeting-url";
import { processMeetingByNativeId } from "@/lib/pipeline/process-meeting";
import { getRunningBots } from "@/lib/vexa/client";
import { applyMeetingStatus, mapVexaStatus } from "@/lib/vexa/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();

    const { data: meetings } = await admin
      .from("meetings")
      .select("id, recall_bot_id, meeting_url, status")
      .in("status", ["bot_joining", "recording"])
      .not("recall_bot_id", "is", null);

    if (!meetings || meetings.length === 0) {
      return NextResponse.json({ ok: true, tracked: 0, updated: 0 });
    }

    const running = await getRunningBots();
    const runningByNative = new Map(running.map((b) => [b.native_meeting_id, b]));

    let updated = 0;
    for (const meeting of meetings) {
      const nativeId = meeting.recall_bot_id;
      if (!nativeId) continue;

      const bot = runningByNative.get(nativeId);
      const vexaStatus = bot ? bot.status : "completed";
      const result = await applyMeetingStatus(admin, {
        nativeMeetingId: nativeId,
        vexaStatus,
        endTime: bot?.end_time,
        startTime: bot?.start_time,
      });
      if (result.updated) updated += 1;

      // Reunião encerrada → ingerir transcrição e analisar.
      if (mapVexaStatus(vexaStatus) === "completed") {
        const parsed = meeting.meeting_url ? parseMeetingUrl(meeting.meeting_url) : null;
        if (parsed) {
          try {
            await processMeetingByNativeId(admin, parsed.platform, nativeId);
          } catch (err) {
            console.error("Falha ao processar reunião (poll):", err);
          }
        }
      }
    }

    return NextResponse.json({ ok: true, tracked: meetings.length, updated });
  } catch (err) {
    console.error("Falha ao consultar bots:", err);
    return NextResponse.json({ error: "Falha ao consultar bots" }, { status: 500 });
  }
}
