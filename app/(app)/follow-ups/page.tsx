import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { FollowUpsHubView } from "@/components/follow-ups/follow-ups-hub-view";
import { Button } from "@/components/ui/button";
import { getFollowUpsHub, parseFollowUpStatusFilter } from "@/lib/follow-ups/hub";
import { createClient } from "@/lib/supabase/server";

export default async function FollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = parseFollowUpStatusFilter(params.status);
  const supabase = await createClient();
  const hub = await getFollowUpsHub(supabase, { status: statusFilter });

  return (
    <div>
      <PageHeader
        title="Follow-ups"
        description="Rascunhos, envios e conclusões de follow-up em todas as reuniões."
        meta={`${hub.pendingCount} pendente${hub.pendingCount === 1 ? "" : "s"}`}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/revisar">Fila de revisão</Link>
          </Button>
        }
      />
      <FollowUpsHubView hub={hub} activeFilter={statusFilter} />
    </div>
  );
}
