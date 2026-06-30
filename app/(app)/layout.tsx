import { AppShell } from "@/components/shell/app-shell";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let name: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle<{ display_name: string | null }>();

    const metadata = user.user_metadata as Record<string, unknown> | undefined;
    const metadataName =
      typeof metadata?.full_name === "string"
        ? metadata.full_name
        : typeof metadata?.display_name === "string"
          ? metadata.display_name
          : null;

    name = profile?.display_name?.trim() || metadataName?.trim() || null;
  }

  return (
    <AppShell user={{ name, email: user?.email ?? null }}>{children}</AppShell>
  );
}
