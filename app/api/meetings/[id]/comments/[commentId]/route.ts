import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UpdateSchema = z.object({
  label: z.string().trim().min(1).max(500).optional(),
  start_ms: z.number().int().min(0).optional(),
  end_ms: z.number().int().min(0).nullish(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { id: meetingId, commentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const parsed = UpdateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("meeting_comments")
    .update(parsed.data)
    .eq("id", commentId)
    .eq("meeting_id", meetingId)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Comentário não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, comment: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { id: meetingId, commentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("meeting_comments")
    .delete()
    .eq("id", commentId)
    .eq("meeting_id", meetingId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Falha ao remover comentário" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
