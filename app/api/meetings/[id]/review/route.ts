import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(
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
    .select("id, user_id, status, meeting_reviewed_at")
    .eq("id", meetingId)
    .maybeSingle<{
      id: string;
      user_id: string;
      status: string;
      meeting_reviewed_at: string | null;
    }>();

  if (!meeting || meeting.user_id !== user.id) {
    return NextResponse.json({ error: "Reunião não encontrada" }, { status: 404 });
  }

  if (meeting.status !== "completed") {
    return NextResponse.json(
      { error: "A revisão só está disponível para reuniões concluídas" },
      { status: 400 }
    );
  }

  if (meeting.meeting_reviewed_at) {
    return NextResponse.json({
      ok: true,
      meeting_reviewed_at: meeting.meeting_reviewed_at,
    });
  }

  const reviewedAt = new Date().toISOString();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("meetings")
    .update({ meeting_reviewed_at: reviewedAt })
    .eq("id", meetingId)
    .eq("user_id", user.id)
    .select("meeting_reviewed_at")
    .maybeSingle<{ meeting_reviewed_at: string }>();

  if (error || !data) {
    return NextResponse.json({ error: "Falha ao registrar revisão" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, meeting_reviewed_at: data.meeting_reviewed_at });
}
