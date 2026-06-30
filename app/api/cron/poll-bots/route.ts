import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pollActiveMeetings } from "@/lib/vexa/poll-meetings";

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
    const summary = await pollActiveMeetings(admin);
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    console.error("Falha ao consultar bots:", err);
    return NextResponse.json({ error: "Falha ao consultar bots" }, { status: 500 });
  }
}
