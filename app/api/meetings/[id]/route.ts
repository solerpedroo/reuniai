import { NextResponse, type NextRequest } from "next/server";
import { deleteMeetingById } from "@/lib/meetings/delete";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: meetingId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, user_id")
    .eq("id", meetingId)
    .maybeSingle<{ id: string; user_id: string }>();

  if (!meeting || meeting.user_id !== user.id) {
    return NextResponse.json({ error: "Reunião não encontrada" }, { status: 404 });
  }

  const admin = createAdminClient();
  const result = await deleteMeetingById(admin, meetingId);

  if (!result.deleted) {
    return NextResponse.json({ error: "Reunião não encontrada" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
