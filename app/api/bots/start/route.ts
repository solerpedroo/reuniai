import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { startBotForMeeting } from "@/lib/vexa/scheduler";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let meetingId: string | undefined;
  try {
    const body = await request.json();
    meetingId = body?.meetingId;
  } catch {
    meetingId = undefined;
  }

  if (!meetingId) {
    return NextResponse.json({ error: "meetingId é obrigatório" }, { status: 400 });
  }

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, user_id, meeting_url, status")
    .eq("id", meetingId)
    .maybeSingle<{ id: string; user_id: string; meeting_url: string | null; status: string }>();

  if (!meeting || meeting.user_id !== user.id) {
    return NextResponse.json({ error: "Reunião não encontrada" }, { status: 404 });
  }

  const admin = createAdminClient();
  const result = await startBotForMeeting(admin, meeting);

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
