import { NextResponse } from "next/server";
import type { CalendarProvider } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function resolveProvider(value: unknown): CalendarProvider {
  return value === "outlook" ? "outlook" : "google";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { provider?: string };
  const provider = resolveProvider(body.provider);

  const { error } = await supabase
    .from("calendar_connections")
    .delete()
    .eq("provider", provider);

  if (error) {
    return NextResponse.json({ error: "Falha ao desconectar" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
