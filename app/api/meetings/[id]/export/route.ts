import { NextResponse, type NextRequest } from "next/server";
import {
  buildMeetingJsonFromData,
  buildMeetingMarkdownFromData,
  buildMeetingPdfFromData,
  loadMeetingExportData,
} from "@/lib/meetings/export";
import { logExportAudit } from "@/lib/privacy/export-audit";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const redact = request.nextUrl.searchParams.get("redact") !== "0";

  if (!["md", "json", "pdf"].includes(format)) {
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

  const data = await loadMeetingExportData(supabase, meeting, {
    redact,
    useLlm: redact,
  });

  const admin = createAdminClient();
  await logExportAudit(admin, {
    userId: user.id,
    meetingId: meeting.id,
    format,
    audit: data.redactionAudit,
  });

  const baseName = slugify(meeting.title) || "reuniao";

  if (format === "json") {
    const json = buildMeetingJsonFromData(data);
    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${baseName}.json"`,
      },
    });
  }

  if (format === "pdf") {
    const pdf = await buildMeetingPdfFromData(data);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${baseName}.pdf"`,
      },
    });
  }

  const markdown = buildMeetingMarkdownFromData(data);
  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${baseName}.md"`,
    },
  });
}
