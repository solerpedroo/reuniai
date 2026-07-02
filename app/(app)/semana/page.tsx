import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { WeeklyReviewView } from "@/components/review/weekly-review-view";
import { getWeeklyReview } from "@/lib/review/weekly-review";
import { createClient } from "@/lib/supabase/server";

export default async function SemanaPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const data = await getWeeklyReview(supabase, { weekKey: params.semana });

  return (
    <div>
      <PageHeader
        title="Revisão da semana"
        description="Feche a semana com números, pendências e plano para a próxima."
        meta="Ritual semanal"
      />

      <Suspense fallback={null}>
        <WeeklyReviewView data={data} />
      </Suspense>
    </div>
  );
}
