import {
  CalendarBlank,
  CalendarCheck,
  ClipboardText,
  EnvelopeSimple,
} from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/layout/page-header";
import { getDailyTimeline } from "@/lib/agenda/daily-timeline";
import {
  DashboardActionQueue,
  type DashboardAction,
} from "@/components/dashboard/dashboard-action-queue";
import { AttentionCard } from "@/components/dashboard/attention-card";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { MeetingsChart } from "@/components/dashboard/meetings-chart";
import { PrepCard } from "@/components/dashboard/prep-card";
import { RecentMeetingsTable } from "@/components/dashboard/recent-meetings-table";
import { SeriesListCard } from "@/components/dashboard/series-list-card";
import { JoinMeetingDialog } from "@/components/meetings/join-meeting-dialog";
import { getInboxCounts } from "@/lib/meetings/action-items-inbox";
import { getActivePrepCard } from "@/lib/meetings/prep";
import { getDashboardData, getMeetingsWeeklyChart } from "@/lib/meetings/queries";
import { getMeetingSeriesList } from "@/lib/series/queries";
import { getFollowUpsHub } from "@/lib/follow-ups/hub";
import { getReviewQueueCounts } from "@/lib/review/review-queue";
import { getWeeklyReview } from "@/lib/review/weekly-review";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function buildDashboardActions(input: {
  reviewPending: number;
  weeklyPending: number;
  followUpsPending: number;
  agendaTodayCount: number;
}): DashboardAction[] {
  const actions: DashboardAction[] = [];

  if (input.reviewPending > 0) {
    actions.push({
      href: "/revisar",
      icon: ClipboardText,
      title: `${input.reviewPending} para revisar`,
      subtitle: "Feche atribuições e follow-ups em lote",
    });
  }

  if (input.weeklyPending > 0) {
    actions.push({
      href: "/semana",
      icon: CalendarCheck,
      title: "Revisão da semana",
      subtitle: `${input.weeklyPending} pendência${input.weeklyPending === 1 ? "" : "s"} para fechar`,
    });
  }

  if (input.followUpsPending > 0) {
    actions.push({
      href: "/follow-ups",
      icon: EnvelopeSimple,
      title: `${input.followUpsPending} follow-up${input.followUpsPending === 1 ? "" : "s"}`,
      subtitle: "Rascunhos e envios aguardando fechamento",
    });
  }

  if (input.agendaTodayCount > 0) {
    actions.push({
      href: "/agenda",
      icon: CalendarBlank,
      title: "Agenda de hoje",
      subtitle: `${input.agendaTodayCount} compromisso${input.agendaTodayCount === 1 ? "" : "s"} restante${input.agendaTodayCount === 1 ? "" : "s"}`,
    });
  }

  return actions;
}

export default async function HomePage() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { stats, recentMeetings, attentionItems },
    chartData,
    series,
    prepCard,
    inboxCounts,
    dayTimeline,
    reviewCounts,
    weeklyReview,
    followUpsHub,
  ] = await Promise.all([
    getDashboardData(supabase),
    getMeetingsWeeklyChart(supabase),
    getMeetingSeriesList(supabase),
    user ? getActivePrepCard(admin, user.id) : Promise.resolve(null),
    getInboxCounts(supabase),
    getDailyTimeline(supabase),
    getReviewQueueCounts(supabase),
    getWeeklyReview(supabase),
    getFollowUpsHub(supabase, { status: "all" }),
  ]);

  const meetingTitleById = new Map(recentMeetings.map((m) => [m.id, m.title]));
  const weeklyPending =
    weeklyReview.unreviewedMeetings.length + weeklyReview.overdueTasks.length;

  const dashboardActions = buildDashboardActions({
    reviewPending: reviewCounts.pending,
    weeklyPending,
    followUpsPending: followUpsHub.pendingCount,
    agendaTodayCount: dayTimeline.entries.length,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Visão geral"
        description="Indicadores, pendências e reuniões recentes."
        meta="Dashboard"
        actions={<JoinMeetingDialog />}
      />

      <KpiCards stats={stats} inboxCounts={inboxCounts} />

      {prepCard ? <PrepCard prep={prepCard} meeting={prepCard.meeting} /> : null}

      <DashboardActionQueue actions={dashboardActions} />

      <MeetingsChart data={chartData} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RecentMeetingsTable meetings={recentMeetings} />
        </div>
        <div className="lg:col-span-2">
          <AttentionCard items={attentionItems} meetingTitleById={meetingTitleById} />
        </div>
      </div>

      {series.length > 0 ? <SeriesListCard series={series} /> : null}
    </div>
  );
}
