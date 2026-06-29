"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type UpdateAutoJoinResult = { error: string } | { ok: true };
export type UpdateRetentionResult = { error: string } | { ok: true };

export async function updateAutoJoin(enabled: boolean): Promise<UpdateAutoJoinResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Não autenticado" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ auto_join_enabled: enabled })
    .eq("id", user.id);

  if (error) {
    return { error: "Falha ao salvar preferência" };
  }

  revalidatePath("/configuracoes");
  return { ok: true };
}

export async function updateRetentionDays(days: number): Promise<UpdateRetentionResult> {
  if (!Number.isFinite(days) || days <= 0) {
    return { error: "Valor de retenção inválido" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Não autenticado" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ retention_days: Math.round(days) })
    .eq("id", user.id);

  if (error) {
    return { error: "Falha ao salvar retenção" };
  }

  revalidatePath("/configuracoes");
  return { ok: true };
}
