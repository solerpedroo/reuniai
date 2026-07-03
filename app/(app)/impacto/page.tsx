import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { PersonalImpactView } from "@/components/impact/personal-impact-view";
import { getPersonalImpact, parseImpactPeriod } from "@/lib/impact/personal-impact";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 300;

export default async function ImpactoPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const period = parseImpactPeriod(params.period);
  const supabase = await createClient();
  const report = await getPersonalImpact(supabase, period);

  return (
    <div>
      <PageHeader
        title="Impacto"
        description="Retrospectiva do valor do produto — horas, coach, compromissos e decisões."
        meta="Capstone"
      />
      <Suspense fallback={null}>
        <PersonalImpactView report={report} />
      </Suspense>
    </div>
  );
}
