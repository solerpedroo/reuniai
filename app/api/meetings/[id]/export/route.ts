import { NextResponse, type NextRequest } from "next/server";
import { buildMeetingMarkdown } from "@/lib/meetings/export";
import { createClient } from "@/lib/supabase/server";
import type { Meeting } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: meetingId } = await params;
  const format = request.nextUrl.searchParams.get("format") ?? "md";

  if (format !== "md") {
    return NextResponse.json({ error: "Formato não suportado" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { data: meeting } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", meetingId)
    .maybeSingle<Meeting>();

  if (!meeting || meeting.user_id !== user.id) {
    return NextResponse.json({ error: "Reunião não encontrada" }, { status: 404 });
  }

  const markdown = await buildMeetingMarkdown(supabase, meeting);
  const filename = `${slugify(meeting.title) || "reuniao"}.md`;

  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
