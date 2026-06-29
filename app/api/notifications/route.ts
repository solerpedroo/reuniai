import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRecentNotifications, markNotificationRead } from "@/lib/notifications/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const notifications = await getRecentNotifications(supabase);
  return NextResponse.json({ notifications });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = (await request.json()) as { id?: string };
  if (!body.id) {
    return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  }

  await markNotificationRead(user.id, body.id);
  return NextResponse.json({ ok: true });
}
