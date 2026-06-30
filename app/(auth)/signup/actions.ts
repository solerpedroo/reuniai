"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { parseUserLocale } from "@/lib/profile/locale";

export type CompleteSignupProfileResult = { error: string } | { ok: true };

export async function completeSignupProfileAction(input: {
  displayName: string;
  timezone: string;
  locale: string;
}): Promise<CompleteSignupProfileResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sessão não encontrada. Confirme seu e-mail e tente novamente." };
  }

  const displayName = input.displayName.trim();
  if (displayName.length < 2) {
    return { error: "Informe seu nome completo." };
  }

  const admin = createAdminClient();
  const { error: profileError } = await admin
    .from("profiles")
    .update({
      display_name: displayName,
      timezone: input.timezone,
      locale: parseUserLocale(input.locale),
    })
    .eq("id", user.id);

  if (profileError) {
    return { error: "Não foi possível salvar seu perfil." };
  }

  const { error: metaError } = await supabase.auth.updateUser({
    data: {
      full_name: displayName,
      display_name: displayName,
      timezone: input.timezone,
      locale: input.locale,
    },
  });

  if (metaError) {
    return { error: "Perfil salvo, mas falhou ao atualizar a sessão." };
  }

  return { ok: true };
}
