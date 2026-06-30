import { NextResponse, type NextRequest } from "next/server";
import { syncCalendarConnectionByProvider } from "@/lib/calendar/sync";
import type { CalendarProvider } from "@/lib/supabase/types";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: connections, error } = await admin
    .from("calendar_connections")
    .select("id, user_id, provider, refresh_token_encrypted");

  if (error) {
    return NextResponse.json({ error: "Falha ao listar conexões" }, { status: 500 });
  }

  let synced = 0;
  let failed = 0;

  for (const connection of connections ?? []) {
    try {
      await syncCalendarConnectionByProvider(admin, {
        userId: connection.user_id,
        connectionId: connection.id,
        refreshTokenEncrypted: connection.refresh_token_encrypted,
        provider: connection.provider as CalendarProvider,
      });
      synced += 1;
    } catch (err) {
      console.error(`Falha ao sincronizar conexão ${connection.id}:`, err);
      failed += 1;
    }
  }

  return NextResponse.json({ ok: true, total: connections?.length ?? 0, synced, failed });
}
