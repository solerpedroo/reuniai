import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  title: z.string().trim().min(1, "Título obrigatório").max(500),
  assignee: z.string().trim().max(200).nullish(),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve ser YYYY-MM-DD")
    .nullish(),
});

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
    .from("action_items")
    .insert({
      meeting_id: meetingId,
      user_id: user.id,
      title: parsed.data.title,
      assignee: parsed.data.assignee ?? null,
      due_date: parsed.data.due_date ?? null,
      source: "manual",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "Falha ao criar item" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data });
}
