import { PageHeader } from "@/components/layout/page-header";
import { PrepHubView } from "@/components/prep/prep-hub-view";
import { getPrepHub, parsePrepHubPeriod } from "@/lib/prep/hub";
import { createClient } from "@/lib/supabase/server";

export default async function PrepPage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  const params = await searchParams;
  const period = parsePrepHubPeriod(params.dias === "14" ? "14d" : params.dias);
  const supabase = await createClient();
  const hub = await getPrepHub(supabase, period);

  return (
    <div>
      <PageHeader
        title="Prep"
        description="Briefings e contexto das suas próximas reuniões — tudo num só lugar."
        meta="Preparação"
      />
      <PrepHubView hub={hub} />
    </div>
  );
}
