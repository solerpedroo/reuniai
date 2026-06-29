import { PageHeader } from "@/components/layout/page-header";
import { AttentionCard } from "@/components/dashboard/attention-card";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { MeetingsChart } from "@/components/dashboard/meetings-chart";
import { PrepCard } from "@/components/dashboard/prep-card";
import { RecentMeetingsTable } from "@/components/dashboard/recent-meetings-table";
import { SeriesListCard } from "@/components/dashboard/series-list-card";
import { JoinMeetingDialog } from "@/components/meetings/join-meeting-dialog";
import { getActivePrepCard } from "@/lib/meetings/prep";
import { getDashboardData, getMeetingsWeeklyChart } from "@/lib/meetings/queries";
import { getMeetingSeriesList } from "@/lib/series/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ stats, recentMeetings, attentionItems }, chartData, series, prepCard] =
    await Promise.all([
      getDashboardData(supabase),
      getMeetingsWeeklyChart(supabase),
      getMeetingSeriesList(supabase),
      user ? getActivePrepCard(admin, user.id) : Promise.resolve(null),
    ]);

  const meetingTitleById = new Map(recentMeetings.map((m) => [m.id, m.title]));

  return (
    <div>
      <PageHeader
        title="Visão geral"
        description="Resumo das suas reuniões, indicadores e itens que precisam de atenção."
        meta="Dashboard"
        actions={<JoinMeetingDialog />}
      />

      <KpiCards stats={stats} />

      {prepCard && (
        <div className="mt-6">
          <PrepCard prep={prepCard} meeting={prepCard.meeting} />
        </div>
      )}

      <div className="mt-6">
        <MeetingsChart data={chartData} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentMeetingsTable meetings={recentMeetings} />
        </div>
        <div>
          <AttentionCard items={attentionItems} meetingTitleById={meetingTitleById} />
        </div>
        <div className="lg:col-span-3">
          <SeriesListCard series={series} />
        </div>
      </div>
    </div>
  );
}
