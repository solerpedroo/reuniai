"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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
      <Button variant="outline" disabled title="Disponível na Onda 11 (LGPD)">
        Deletar conta
      </Button>
    </div>
  );
}
