import { PageHeader } from "@/components/layout/page-header";
import { DecisionsRegistryView } from "@/components/decisions/decisions-registry-view";
import {
  getDecisionRegistry,
  parseDecisionPeriod,
  parseOutcomeStatus,
} from "@/lib/decisions/registry";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 300;

export default async function DecisoesPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; status?: string }>;
}) {
  const params = await searchParams;
  const period = parseDecisionPeriod(params.period);
  const statusFilter = parseOutcomeStatus(params.status);
  const supabase = await createClient();
  const registry = await getDecisionRegistry(supabase, period, {
    statusFilter: statusFilter === "all" ? "all" : statusFilter,
  });

  return (
    <div>
      <PageHeader
        title="Decisões"
        description="Acompanhe decisões ao longo do tempo — status, sugestões da IA e timeline por reunião."
        meta="Registro v2"
      />
      <DecisionsRegistryView registry={registry} statusFilter={statusFilter} />
    </div>
  );
}
