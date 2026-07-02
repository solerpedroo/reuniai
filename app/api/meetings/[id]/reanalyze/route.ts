import { NextResponse, type NextRequest } from "next/server";
import { analyzeMeetingById } from "@/lib/pipeline/analyze-meeting";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MIN_INTERVAL_MS = 60_000;

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
    .select("id, updated_at")
    .eq("id", meetingId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!meeting) {
    return NextResponse.json({ error: "Reunião não encontrada" }, { status: 404 });
  }

  const { data: summary } = await supabase
    .from("meeting_summaries")
    .select("updated_at")
    .eq("meeting_id", meetingId)
    .maybeSingle();

  const summaryUpdatedAt = (summary as { updated_at?: string } | null)?.updated_at;
  const lastRun = summaryUpdatedAt ? new Date(summaryUpdatedAt).getTime() : 0;

  if (Date.now() - lastRun < MIN_INTERVAL_MS) {
    return NextResponse.json(
      { error: "Aguarde 1 minuto entre re-análises" },
      { status: 429 }
    );
  }

  const admin = createAdminClient();
  const result = await analyzeMeetingById(admin, meetingId);

  return NextResponse.json({ ok: true, result });
}
