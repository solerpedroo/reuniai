import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { listPlaybooks } from "@/lib/playbooks/queries";
import type { PlaybookAction, PlaybookConditions } from "@/lib/playbooks/types";

export const dynamic = "force-dynamic";

const ConditionsSchema = z.object({
  title_contains: z.string().max(100).optional(),
  series_id: z.string().max(200).optional(),
  template_id: z.string().max(100).optional(),
  platform: z.string().max(50).optional(),
});

const ActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("generate_follow_up") }),
  z.object({
    type: z.literal("apply_tags"),
    tag_ids: z.array(z.string().uuid()).min(1).max(10),
  }),
  z.object({
    type: z.literal("set_folder"),
    folder_id: z.string().uuid(),
  }),
]);

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  enabled: z.boolean().optional(),
  conditions: ConditionsSchema.default({}),
  actions: z.array(ActionSchema).max(10).default([]),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const playbooks = await listPlaybooks(supabase);
  return NextResponse.json({ playbooks });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
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
    .from("playbooks")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      enabled: parsed.data.enabled ?? true,
      conditions: parsed.data.conditions as PlaybookConditions,
      actions: parsed.data.actions as PlaybookAction[],
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ playbook: data });
}
