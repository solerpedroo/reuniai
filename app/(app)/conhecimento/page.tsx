import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { KnowledgeHubView } from "@/components/knowledge/knowledge-hub-view";
import { listKnowledgeEntries } from "@/lib/knowledge/entries";
import { createClient } from "@/lib/supabase/server";

export default async function ConhecimentoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const entries = await listKnowledgeEntries(admin, user.id);

  return (
    <div>
      <PageHeader
        title="Conhecimento"
        description="Wiki viva gerada das suas reuniões — decisões e contexto com proveniência."
        meta="Memória"
        actions={
          <Link href="/busca" className="text-sm text-muted-foreground underline">
            Buscar
          </Link>
        }
      />
      <KnowledgeHubView entries={entries} />
    </div>
  );
}
