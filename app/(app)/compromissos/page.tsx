import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { CommitmentsHubView } from "@/components/commitments/commitments-hub-view";
import { Button } from "@/components/ui/button";
import { getCommitmentsHub, parseCommitmentStatusFilter } from "@/lib/commitments/hub";
import { createClient } from "@/lib/supabase/server";

export default async function CompromissosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = parseCommitmentStatusFilter(params.status);
  const supabase = await createClient();
  const hub = await getCommitmentsHub(supabase, { status: statusFilter });

  return (
    <div>
      <PageHeader
        title="Compromissos"
        description="Promessas verbais extraídas das reuniões — o que você deve, o que te devem e acordos mútuos."
        meta={`${hub.counts.pending + hub.counts.overdue} em aberto`}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/tarefas">Inbox de tarefas</Link>
          </Button>
        }
      />
      <CommitmentsHubView hub={hub} activeFilter={statusFilter} />
    </div>
  );
}
