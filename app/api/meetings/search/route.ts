import { NextResponse, type NextRequest } from "next/server";
import { searchMeetings } from "@/lib/meetings/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ meetings: [] });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const page = await searchMeetings(supabase, q, { limit: 5 });

  return NextResponse.json({
    meetings: page.meetings.map((meeting) => ({
      id: meeting.id,
      title: meeting.title,
      started_at: meeting.started_at,
      status: meeting.status,
    })),
  });
}
