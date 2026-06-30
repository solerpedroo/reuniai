import { PageHeader } from "@/components/layout/page-header";
import { ProfileForm } from "@/components/profile/profile-form";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";
import { parseUserLocale } from "@/lib/profile/locale";

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName = "";
  let timezone = "America/Sao_Paulo";
  let locale = parseUserLocale("pt-BR");

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, timezone, locale")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      const typed = profile as Pick<Profile, "display_name" | "timezone" | "locale">;
      displayName = typed.display_name?.trim() ?? "";
      timezone = typed.timezone ?? timezone;
      locale = parseUserLocale(typed.locale);
    }

    if (!displayName) {
      const metadata = user.user_metadata as {
        display_name?: string;
        full_name?: string;
        name?: string;
      };
      displayName =
        metadata.display_name?.trim() ||
        metadata.full_name?.trim() ||
        metadata.name?.trim() ||
        "";
    }
  }

  const email = user?.email ?? "";

  return (
    <div>
      <PageHeader
        title="Meu perfil"
        description="Gerencie as informações da sua conta preenchidas no cadastro."
        meta="Conta"
      />
      <ProfileForm
        initialDisplayName={displayName}
        email={email}
        initialTimezone={timezone}
        initialLocale={locale}
      />
    </div>
  );
}
