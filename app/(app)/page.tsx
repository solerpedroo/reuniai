import { PageHeader } from "@/components/layout/page-header";
import { AttentionCard } from "@/components/dashboard/attention-card";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { RecentMeetingsTable } from "@/components/dashboard/recent-meetings-table";
import { JoinMeetingDialog } from "@/components/meetings/join-meeting-dialog";
import { getDashboardData } from "@/lib/meetings/queries";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { stats, recentMeetings, attentionItems } = await getDashboardData(supabase);

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

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentMeetingsTable meetings={recentMeetings} />
        </div>
        <div>
          <AttentionCard items={attentionItems} meetingTitleById={meetingTitleById} />
        </div>
      </div>
    </div>
  );
}
