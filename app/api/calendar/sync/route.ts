import { NextResponse } from "next/server";
import { syncCalendarConnection } from "@/lib/calendar/google";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { CalendarConnection } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { data: connection, error } = await supabase
    .from("calendar_connections")
    .select("*")
    .eq("provider", "google")
    .maybeSingle<CalendarConnection>();

  if (error) {
    return NextResponse.json({ error: "Falha ao carregar conexão" }, { status: 500 });
  }
  if (!connection) {
    return NextResponse.json({ error: "Nenhum calendário conectado" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const result = await syncCalendarConnection(admin, {
      userId: user.id,
      connectionId: connection.id,
      refreshTokenEncrypted: connection.refresh_token_encrypted,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("Erro ao sincronizar calendário:", err);
    return NextResponse.json({ error: "Falha na sincronização" }, { status: 500 });
  }
}
