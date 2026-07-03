import { NextResponse } from "next/server";
import { z } from "zod";
import { createMeetingClip } from "@/lib/clips/clips";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  days: z.number().int().min(1).max(30).optional(),
  redact_pii: z.boolean().optional(),
});

export async function POST(
  _request: Request,
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

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id")
    .eq("id", meetingId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!meeting) {
    return NextResponse.json({ error: "Reunião não encontrada" }, { status: 404 });
  }

  const { data: highlight } = await supabase
    .from("meeting_highlights")
    .select("id, label, start_ms, end_ms")
    .eq("id", highlightId)
    .eq("meeting_id", meetingId)
    .maybeSingle<{ id: string; label: string; start_ms: number; end_ms: number | null }>();

  if (!highlight) {
    return NextResponse.json({ error: "Highlight não encontrado" }, { status: 404 });
  }

  let body: unknown = {};
  try {
    body = await _request.json();
  } catch {
    /* defaults */
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const result = await createMeetingClip(admin, {
      userId: user.id,
      meetingId,
      highlightId: highlight.id,
      caption: highlight.label,
      startMs: highlight.start_ms,
      endMs: highlight.end_ms,
      days: parsed.data.days,
      redactPii: parsed.data.redact_pii,
    });

    return NextResponse.json({ clip: result.clip, url: result.url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao criar clip" },
      { status: 500 }
    );
  }
}
