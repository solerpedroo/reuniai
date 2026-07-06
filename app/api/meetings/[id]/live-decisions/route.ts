import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getLiveElapsedMs, isLiveMeetingStatus } from "@/lib/meetings/live-elapsed";
import { isRateLimited, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  text: z.string().trim().min(1, "Texto obrigatório").max(1000),
  captured_at_ms: z.number().int().min(0).optional(),
});

export async function GET(
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

  const { data, error } = await supabase
    .from("meeting_live_decisions")
    .select("*")
    .eq("meeting_id", meetingId)
    .order("captured_at_ms", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ decisions: data ?? [] });
}

export async function POST(
  request: NextRequest,
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

  if (isRateLimited({ key: `live-capture:${user.id}`, limit: 40, windowMs: 60_000 })) {
    const { error, status } = rateLimitResponse("Muitas capturas ao vivo. Aguarde um instante.");
    return NextResponse.json({ error }, { status });
  }

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, user_id, status, started_at, bot_session_started_at")
    .eq("id", meetingId)
    .maybeSingle<{
      id: string;
      user_id: string;
      status: string;
      started_at: string;
      bot_session_started_at: string | null;
    }>();

  if (!meeting || meeting.user_id !== user.id) {
    return NextResponse.json({ error: "Reunião não encontrada" }, { status: 404 });
  }

  if (!isLiveMeetingStatus(meeting.status)) {
    return NextResponse.json({ error: "Reunião não está ao vivo" }, { status: 409 });
  }

  const parsed = CreateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const capturedAtMs = parsed.data.captured_at_ms ?? getLiveElapsedMs(meeting);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("meeting_live_decisions")
    .insert({
      meeting_id: meetingId,
      user_id: user.id,
      text: parsed.data.text,
      captured_at_ms: capturedAtMs,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "Falha ao registrar decisão" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, decision: data });
}

export async function DELETE(
  request: NextRequest,
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

  const body = (await request.json().catch(() => ({}))) as { id?: string };
  if (!body.id) {
    return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  }

  const { error } = await supabase
    .from("meeting_live_decisions")
    .delete()
    .eq("id", body.id)
    .eq("meeting_id", meetingId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
