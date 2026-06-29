"use server";

import { redirect } from "next/navigation";
import { completeUserOnboarding } from "@/lib/profile/complete-onboarding";
import { createClient } from "@/lib/supabase/server";

export type CompleteOnboardingResult = { error: string } | undefined;

export async function completeOnboardingAction(
  autoJoinEnabled: boolean,
  consentAccepted: boolean
): Promise<CompleteOnboardingResult> {
  if (!consentAccepted) {
    return { error: "Consentimento LGPD é obrigatório" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await completeUserOnboarding(user.id, autoJoinEnabled);

  if (error) {
    return { error: "Falha ao salvar perfil" };
  }

  redirect("/");
}
