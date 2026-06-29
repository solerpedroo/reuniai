import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { deleteUserAccount } from "@/lib/account/delete";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { NotificationPrefs } from "@/lib/workflow/types";

export const dynamic = "force-dynamic";

const DeleteSchema = z.object({
  confirmation: z.literal("DELETAR"),
});

const PatchSchema = z.object({
  notification_prefs: z
    .object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      prep: z.boolean().optional(),
      completed: z.boolean().optional(),
    })
    .optional(),
  timezone: z.string().optional(),
});

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const parsed = PatchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const updates: Database["public"]["Tables"]["profiles"]["Update"] = {};
  if (parsed.data.notification_prefs) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("notification_prefs")
      .eq("id", user.id)
      .maybeSingle();

    const current = (profile as { notification_prefs?: NotificationPrefs } | null)
      ?.notification_prefs ?? {
      email: false,
      push: false,
      prep: true,
      completed: true,
    };

    updates.notification_prefs = { ...current, ...parsed.data.notification_prefs };
  }

  if (parsed.data.timezone) {
    updates.timezone = parsed.data.timezone;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update(updates)
    .eq("id", user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const parsed = DeleteSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Digite "DELETAR" para confirmar a exclusão da conta.' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const result = await deleteUserAccount(admin, user.id);

  await supabase.auth.signOut();

  return NextResponse.json({ ok: true, meetingsDeleted: result.meetingsDeleted });
}
