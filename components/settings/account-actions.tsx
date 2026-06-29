"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";
import { createClient } from "@/lib/supabase/client";

export function AccountActions() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" onClick={handleLogout} disabled={loading}>
        {loading ? "Saindo…" : "Sair da conta"}
      </Button>
      <DeleteAccountDialog />
    </div>
  );
}
