import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { PlaybookAction, PlaybookConditions } from "@/lib/playbooks/types";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  enabled: z.boolean().optional(),
  conditions: z
    .object({
      title_contains: z.string().max(100).optional(),
      series_id: z.string().max(200).optional(),
      template_id: z.string().max(100).optional(),
      platform: z.string().max(50).optional(),
    })
    .optional(),
  actions: z
    .array(
      z.discriminatedUnion("type", [
        z.object({ type: z.literal("generate_follow_up") }),
        z.object({
          type: z.literal("apply_tags"),
          tag_ids: z.array(z.string().uuid()).min(1).max(10),
        }),
        z.object({
          type: z.literal("set_folder"),
          folder_id: z.string().uuid(),
        }),
      ])
    )
    .max(10)
    .optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const parsed = PatchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const updates: Database["public"]["Tables"]["playbooks"]["Update"] = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.enabled !== undefined) updates.enabled = parsed.data.enabled;
  if (parsed.data.conditions !== undefined) {
    updates.conditions = parsed.data.conditions as PlaybookConditions;
  }
  if (parsed.data.actions !== undefined) {
    updates.actions = parsed.data.actions as PlaybookAction[];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nenhuma alteração informada" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("playbooks")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ playbook: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("playbooks").delete().eq("id", id).eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
