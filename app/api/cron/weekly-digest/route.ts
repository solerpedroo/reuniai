import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runWeeklyDigestCron } from "@/lib/digest/run-weekly-digest";

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
    const summary = await runWeeklyDigestCron(admin);
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    console.error("Falha no cron de digest semanal:", err);
    return NextResponse.json({ error: "Falha no cron de digest semanal" }, { status: 500 });
  }
}
