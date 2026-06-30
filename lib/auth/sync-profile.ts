import type { Database } from "@/lib/supabase/database.types";
import { parseUserLocale } from "@/lib/profile/locale";

type UserMetadata = {
  full_name?: string;
  name?: string;
  display_name?: string;
  timezone?: string;
  locale?: string;
};

type ProfileUpdateClient = {
  from: (table: "profiles") => {
    update: (values: Database["public"]["Tables"]["profiles"]["Update"]) => {
      eq: (column: "id", value: string) => PromiseLike<unknown>;
    };
  };
};

/** Sincroniza metadata do auth → profiles (OAuth e signup com confirmação de e-mail). */
export async function syncProfileFromAuthUser(
  supabase: ProfileUpdateClient,
  userId: string,
  metadata: UserMetadata | undefined,
  email?: string | null
): Promise<void> {
  const displayName =
    metadata?.display_name?.trim() ||
    metadata?.full_name?.trim() ||
    metadata?.name?.trim() ||
    null;

  const updates: Database["public"]["Tables"]["profiles"]["Update"] = {};

  if (displayName) updates.display_name = displayName;
  if (metadata?.timezone) updates.timezone = metadata.timezone;
  if (metadata?.locale) updates.locale = parseUserLocale(metadata.locale);

  if (Object.keys(updates).length === 0 && !displayName && email) {
    return;
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from("profiles").update(updates).eq("id", userId);
  }
}
