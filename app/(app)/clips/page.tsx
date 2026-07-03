import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { ClipsHubView } from "@/components/clips/clips-hub-view";
import { Button } from "@/components/ui/button";
import { getClipsHub } from "@/lib/clips/hub";
import { createClient } from "@/lib/supabase/server";

export default async function ClipsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const includeInactive = params.status === "expirados";
  const hub = await getClipsHub(supabase, { includeInactive });

  return (
    <div>
      <PageHeader
        title="Clips"
        description="Trechos específicos da call — compartilhe só o momento que importa."
        meta={`${hub.activeCount} ativo${hub.activeCount === 1 ? "" : "s"}`}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href={includeInactive ? "/clips" : "/clips?status=expirados"}>
              {includeInactive ? "Só ativos" : "Ver expirados"}
            </Link>
          </Button>
        }
      />
      <ClipsHubView hub={hub} />
    </div>
  );
}
