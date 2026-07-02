import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { ShareLinksHubView } from "@/components/share/share-links-hub-view";
import { Button } from "@/components/ui/button";
import { getShareLinksHub } from "@/lib/meetings/share-hub";
import { createClient } from "@/lib/supabase/server";

export default async function CompartilharPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const includeInactive = params.status === "expirados";
  const hub = await getShareLinksHub(supabase, { includeInactive });

  return (
    <div>
      <PageHeader
        title="Links compartilhados"
        description="Gerencie URLs read-only ativas — revogue ou copie com um clique."
        meta={`${hub.activeCount} ativo${hub.activeCount === 1 ? "" : "s"}`}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href={includeInactive ? "/compartilhar" : "/compartilhar?status=expirados"}>
              {includeInactive ? "Só ativos" : "Ver expirados"}
            </Link>
          </Button>
        }
      />
      <ShareLinksHubView hub={hub} />
    </div>
  );
}
