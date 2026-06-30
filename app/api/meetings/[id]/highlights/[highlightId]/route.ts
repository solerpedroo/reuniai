import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; highlightId: string }> }
) {
  const { id: meetingId, highlightId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("meeting_highlights")
    .delete()
    .eq("id", highlightId)
    .eq("meeting_id", meetingId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Falha ao remover highlight" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
