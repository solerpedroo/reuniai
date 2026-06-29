import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(500).optional(),
    assignee: z.string().trim().max(200).nullish(),
    due_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve ser YYYY-MM-DD")
      .nullish(),
    status: z.enum(["open", "done", "cancelled"]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nada para atualizar");

async function authorize(meetingId: string, itemId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado", status: 401 as const };

  const { data: item } = await supabase
    .from("action_items")
    .select("id, user_id, meeting_id")
    .eq("id", itemId)
    .eq("meeting_id", meetingId)
    .maybeSingle<{ id: string; user_id: string; meeting_id: string }>();

  if (!item || item.user_id !== user.id) {
    return { error: "Item não encontrado", status: 404 as const };
  }
  return { userId: user.id };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id: meetingId, itemId } = await params;
  const auth = await authorize(meetingId, itemId);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
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
    .from("action_items")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", itemId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "Falha ao atualizar item" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id: meetingId, itemId } = await params;
  const auth = await authorize(meetingId, itemId);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("action_items").delete().eq("id", itemId);

  if (error) {
    return NextResponse.json({ error: "Falha ao remover item" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
