import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export async function completeUserOnboarding(userId: string, autoJoinEnabled: boolean) {
  const supabase = createAdminClient();

  return supabase
    .from("profiles")
    .update({
      auto_join_enabled: autoJoinEnabled,
      onboarding_completed: true,
    })
    .eq("id", userId);
}
