import { PageHeader } from "@/components/layout/page-header";
import { ParticipationDashboard } from "@/components/participation/participation-dashboard";
import {
  getTalkTimeStats,
  parseTalkTimePeriod,
} from "@/lib/insights/talk-time-stats";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 300;

export default async function ParticipacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const period = parseTalkTimePeriod(params.period);
  const supabase = await createClient();
  const stats = await getTalkTimeStats(supabase, period);

  return (
    <div>
      <PageHeader
        title="Participação"
        description="Quem fala quanto — equilíbrio em 1:1s, dominância em standups e evolução por série."
        meta="Talk-time"
      />
      <ParticipationDashboard stats={stats} />
    </div>
  );
}
