import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { snoozeUntilFromPreset } from "@/lib/action-items/priority";
import { pullHubTaskToActionItem } from "@/lib/tasks/hub-sync";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SnoozeSchema = z
  .object({
    preset: z.enum(["tomorrow", "next_week"]).optional(),
    until: z.string().datetime().optional(),
    clear: z.boolean().optional(),
  })
  .refine((value) => value.clear || value.preset || value.until, "Informe preset, until ou clear");

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { data: task } = await supabase
    .from("user_tasks")
    .select("id, user_id")
    .eq("id", taskId)
    .maybeSingle<{ id: string; user_id: string }>();

  if (!task || task.user_id !== user.id) {
    return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });
  }

  const parsed = SnoozeSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const snoozedUntil = parsed.data.clear
    ? null
    : parsed.data.until ?? snoozeUntilFromPreset(parsed.data.preset!);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_tasks")
    .update({ snoozed_until: snoozedUntil, updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "Falha ao adiar tarefa" }, { status: 500 });
  }

  try {
    await pullHubTaskToActionItem(admin, taskId);
  } catch (err) {
    console.error("Falha sync snooze (não bloqueante):", err);
  }

  return NextResponse.json({ ok: true, task: data });
}
