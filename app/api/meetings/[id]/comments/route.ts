import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  label: z.string().trim().min(1, "Descrição obrigatória").max(500),
  start_ms: z.number().int().min(0),
  end_ms: z.number().int().min(0).nullish(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: meetingId } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("meeting_comments")
    .select("*")
    .eq("meeting_id", meetingId)
    .order("start_ms", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ comments: data ?? [] });
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

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, user_id")
    .eq("id", meetingId)
    .maybeSingle<{ id: string; user_id: string }>();

  if (!meeting || meeting.user_id !== user.id) {
    return NextResponse.json({ error: "Reunião não encontrada" }, { status: 404 });
  }

  const parsed = CreateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("meeting_comments")
    .insert({
      meeting_id: meetingId,
      user_id: user.id,
      label: parsed.data.label,
      start_ms: parsed.data.start_ms,
      end_ms: parsed.data.end_ms ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "Falha ao criar comentário" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, comment: data });
}
