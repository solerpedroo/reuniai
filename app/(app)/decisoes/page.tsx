import { PageHeader } from "@/components/layout/page-header";
import { DecisionsRegistryView } from "@/components/decisions/decisions-registry-view";
import { getDecisionRegistry, parseDecisionPeriod } from "@/lib/decisions/registry";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 300;

export default async function DecisoesPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const period = parseDecisionPeriod(params.period);
  const supabase = await createClient();
  const registry = await getDecisionRegistry(supabase, period);

  return (
    <div>
      <PageHeader
        title="Decisões"
        description="Histórico pesquisável de decisões extraídas dos resumos das suas reuniões."
        meta="Registro"
      />
      <DecisionsRegistryView registry={registry} />
    </div>
  );
}
