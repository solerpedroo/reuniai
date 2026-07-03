import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  generateMeetingMinutes,
  getMinutesForMeeting,
} from "@/lib/minutes/generate-minutes";
import { buildMinutesPdf } from "@/lib/minutes/minutes-pdf";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const minutes = await getMinutesForMeeting(supabase, id);
  if (!minutes) {
    return NextResponse.json({ error: "Ata não encontrada." }, { status: 404 });
  }

  const url = new URL(request.url);
  if (url.searchParams.get("format") === "pdf") {
    const pdf = await buildMinutesPdf(minutes.content_json);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ata-${id.slice(0, 8)}.pdf"`,
      },
    });
  }

  return NextResponse.json({ minutes });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!meeting) {
    return NextResponse.json({ error: "Reunião não encontrada." }, { status: 404 });
  }

  try {
    const admin = createAdminClient();
    const minutes = await generateMeetingMinutes(admin, user.id, id);
    return NextResponse.json({ minutes });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao gerar ata.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
