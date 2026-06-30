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
    name = profile?.display_name ?? null;
  }

  return (
    <AppShell user={{ name, email: user?.email ?? null }}>{children}</AppShell>
  );
}
