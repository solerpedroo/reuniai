import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { pullHubTaskToActionItem } from "@/lib/tasks/hub-sync";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(500).optional(),
    assignee: z.string().trim().max(200).nullish(),
    due_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullish(),
    status: z.enum(["open", "done", "cancelled"]).optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    snoozed_until: z.string().datetime().nullish(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nada para atualizar");

async function authorize(taskId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado", status: 401 as const };

  const { data: task } = await supabase
    .from("user_tasks")
    .select("id, user_id")
    .eq("id", taskId)
    .maybeSingle<{ id: string; user_id: string }>();

  if (!task || task.user_id !== user.id) {
    return { error: "Tarefa não encontrada", status: 404 as const };
  }
  return { userId: user.id };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const auth = await authorize(taskId);
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
    .from("user_tasks")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "Falha ao atualizar tarefa" }, { status: 500 });
  }

  try {
    await pullHubTaskToActionItem(admin, taskId);
  } catch (err) {
    console.error("Falha sync hub → action item (não bloqueante):", err);
  }

  return NextResponse.json({ ok: true, task: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const auth = await authorize(taskId);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("user_tasks").delete().eq("id", taskId);

  if (error) {
    return NextResponse.json({ error: "Falha ao remover tarefa" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
