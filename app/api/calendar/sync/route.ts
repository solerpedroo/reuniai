import { NextResponse } from "next/server";
import { syncCalendarConnectionByProvider } from "@/lib/calendar/sync";
import type { CalendarConnection, CalendarProvider } from "@/lib/supabase/types";
import { createAdminClient } from "@/lib/supabase/admin";
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

  const { data: connection, error } = await supabase
    .from("calendar_connections")
    .select("*")
    .eq("provider", provider)
    .maybeSingle<CalendarConnection>();

  if (error) {
    return NextResponse.json({ error: "Falha ao carregar conexão" }, { status: 500 });
  }
  if (!connection) {
    return NextResponse.json({ error: "Nenhum calendário conectado" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const result = await syncCalendarConnectionByProvider(admin, {
      userId: user.id,
      connectionId: connection.id,
      refreshTokenEncrypted: connection.refresh_token_encrypted,
      provider,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("Erro ao sincronizar calendário:", err);
    return NextResponse.json({ error: "Falha na sincronização" }, { status: 500 });
  }
}
