import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { buildBotDisplayName } from "@/lib/brand/bot-name";

type AdminClient = ReturnType<typeof createAdminClient>;

/** Nome do bot na call para um usuário (`ReuniAI - Nome`). */
export async function getBotDisplayNameForUser(
  admin: AdminClient,
  userId: string
): Promise<string> {
  const [{ data: profile }, { data: authUser }] = await Promise.all([
    admin.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    admin.auth.admin.getUserById(userId),
  ]);

  const user = authUser.user;
  const metadata = user?.user_metadata as { full_name?: string; name?: string } | undefined;

  return buildBotDisplayName({
    displayName: (profile as { display_name?: string | null } | null)?.display_name,
    email: user?.email,
    metadataFullName: metadata?.full_name ?? metadata?.name,
  });
}
