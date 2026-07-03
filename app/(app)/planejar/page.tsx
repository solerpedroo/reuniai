import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { WeeklyPlannerWizard } from "@/components/planner/weekly-planner-wizard";
import { getWeeklyPlannerData } from "@/lib/planner/weekly-planner";
import { createClient } from "@/lib/supabase/server";

export default async function PlanejarPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const data = await getWeeklyPlannerData(supabase, { weekKey: params.semana });

  return (
    <div>
      <PageHeader
        title="Planejar a semana"
        description="Revise pendências, priorize tarefas, veja a agenda e defina sua intenção."
        meta={data.weekLabel}
      />
      <Suspense fallback={null}>
        <WeeklyPlannerWizard data={data} />
      </Suspense>
    </div>
  );
}
