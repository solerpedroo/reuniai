import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { error } = await supabase
    .from("calendar_connections")
    .delete()
    .eq("provider", "google");

  if (error) {
    return NextResponse.json({ error: "Falha ao desconectar" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
