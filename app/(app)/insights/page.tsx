import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { InsightsDashboard } from "@/components/insights/insights-dashboard";
import {
  getInsightsForPeriod,
  parseInsightPeriod,
} from "@/lib/insights/period-stats";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 300;

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const period = parseInsightPeriod(params.period);
  const supabase = await createClient();
  const insights = await getInsightsForPeriod(supabase, period);

  return (
    <div>
      <PageHeader
        title="Insights"
        description="Tendências de reuniões, tarefas e participantes ao longo do tempo."
        meta="Análise"
      />

      <Suspense fallback={null}>
        <InsightsDashboard insights={insights} />
      </Suspense>
    </div>
  );
}
