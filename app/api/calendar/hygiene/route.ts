import { NextResponse } from "next/server";
import { analyzeCalendarHygiene } from "@/lib/calendar/hygiene";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const report = await analyzeCalendarHygiene(admin, user.id);
    return NextResponse.json({ report });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao analisar calendário.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
