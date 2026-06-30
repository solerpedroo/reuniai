"use server";

import { revalidatePath } from "next/cache";
import { profileUpdateSchema } from "@/lib/auth/profile-schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { parseUserLocale } from "@/lib/profile/locale";

export type UpdateProfileResult = { error: string } | { ok: true };

export async function updateProfileAction(
  input: unknown
): Promise<UpdateProfileResult> {
  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sessão expirada. Faça login novamente." };
  }

  const { displayName, timezone, locale } = parsed.data;

  const admin = createAdminClient();
  const { error: profileError } = await admin
    .from("profiles")
    .update({
      display_name: displayName,
      timezone,
      locale: parseUserLocale(locale),
    })
    .eq("id", user.id);

  if (profileError) {
    return { error: "Não foi possível salvar seu perfil." };
  }

  const { error: metaError } = await supabase.auth.updateUser({
    data: {
      full_name: displayName,
      display_name: displayName,
      timezone,
      locale,
    },
  });

  if (metaError) {
    return { error: "Perfil salvo, mas falhou ao atualizar a sessão." };
  }

  revalidatePath("/", "layout");
  revalidatePath("/perfil");

  return { ok: true };
}
