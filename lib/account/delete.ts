import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { deleteAllMeetingsForUser } from "@/lib/meetings/delete";

type AdminClient = ReturnType<typeof createAdminClient>;

/** Exclui conta completa: reuniões (Storage + DB), conexões, perfil e auth.users. */
export async function deleteUserAccount(
  admin: AdminClient,
  userId: string
): Promise<{ meetingsDeleted: number }> {
  const meetingsDeleted = await deleteAllMeetingsForUser(admin, userId);

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw error;

  return { meetingsDeleted };
}
