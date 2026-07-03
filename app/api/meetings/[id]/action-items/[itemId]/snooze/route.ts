import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { snoozeUntilFromPreset } from "@/lib/action-items/priority";
import { syncActionItemById } from "@/lib/tasks/hub-sync";
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id: meetingId, itemId } = await params;
  const auth = await authorize(meetingId, itemId);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
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
    .from("action_items")
    .update({ snoozed_until: snoozedUntil, updated_at: new Date().toISOString() })
    .eq("id", itemId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "Falha ao adiar item" }, { status: 500 });
  }

  try {
    await syncActionItemById(admin, itemId);
  } catch (err) {
    console.error("Falha hub sync snooze (não bloqueante):", err);
  }

  return NextResponse.json({ ok: true, item: data });
}
