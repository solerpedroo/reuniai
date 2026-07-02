import Link from "next/link";
import { ArrowRight, CalendarBlank, ChartLineUp } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/layout/page-header";
import { getDailyTimeline } from "@/lib/agenda/daily-timeline";
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
import { ReviewQueueHomeCard } from "@/components/review/review-queue-home-card";
import { WeeklyReviewHomeCard } from "@/components/review/weekly-review-home-card";
import { HighlightsHomeCard } from "@/components/highlights/highlights-home-card";
import { LibraryHomeCard } from "@/components/library/library-home-card";
import { getHighlightsLibrary } from "@/lib/meetings/highlights-library";
import { getReviewQueueCounts } from "@/lib/review/review-queue";
import { getWeeklyReview } from "@/lib/review/weekly-review";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ stats, recentMeetings, attentionItems }, chartData, series, prepCard, inboxCounts, dayTimeline, reviewCounts, weeklyReview, highlightsLibrary] =
    await Promise.all([
      getDashboardData(supabase),
      getMeetingsWeeklyChart(supabase),
      getMeetingSeriesList(supabase),
      user ? getActivePrepCard(admin, user.id) : Promise.resolve(null),
      getInboxCounts(supabase),
      getDailyTimeline(supabase),
      getReviewQueueCounts(supabase),
      getWeeklyReview(supabase),
      getHighlightsLibrary(supabase, { limit: 1 }),
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

      <KpiCards stats={stats} inboxCounts={inboxCounts} />

      <ReviewQueueHomeCard pendingCount={reviewCounts.pending} />

      <WeeklyReviewHomeCard
        pendingCount={
          weeklyReview.unreviewedMeetings.length + weeklyReview.overdueTasks.length
        }
      />

      <HighlightsHomeCard count={highlightsLibrary.total} />

      <LibraryHomeCard />

      <Link
        href="/prep"
        className="surface-card mt-4 flex items-center justify-between gap-3 p-4 transition-colors hover:border-brand/30"
      >
        <div className="flex items-center gap-3">
          <CalendarBlank size={20} className="text-brand" aria-hidden />
          <div>
            <p className="text-sm font-medium">Hub de prep</p>
            <p className="text-xs text-muted-foreground">
              Briefings e contexto das próximas reuniões
            </p>
          </div>
        </div>
        <ArrowRight size={16} className="text-muted-foreground" aria-hidden />
      </Link>

      <Link
        href="/agenda"
        className="surface-card mt-4 flex items-center justify-between gap-3 p-4 transition-colors hover:border-brand/30"
      >
        <div className="flex items-center gap-3">
          <CalendarBlank size={20} className="text-brand" aria-hidden />
          <div>
            <p className="text-sm font-medium">Resumo do seu dia</p>
            <p className="text-xs text-muted-foreground">
              {dayTimeline.entries.length > 0
                ? `${dayTimeline.entries.length} item${dayTimeline.entries.length === 1 ? "" : "s"} na agenda de hoje`
                : "Nenhum compromisso urgente — veja a agenda completa"}
            </p>
          </div>
        </div>
        <ArrowRight size={16} className="shrink-0 text-muted-foreground" aria-hidden />
      </Link>

      <Link
        href="/insights"
        className="surface-card mt-4 flex items-center justify-between gap-3 p-4 transition-colors hover:border-brand/30"
      >
        <div className="flex items-center gap-3">
          <ChartLineUp size={20} className="text-brand" aria-hidden />
          <div>
            <p className="text-sm font-medium">Ver insights completos</p>
            <p className="text-xs text-muted-foreground">
              Horas gravadas, decisões e participantes frequentes
            </p>
          </div>
        </div>
        <ArrowRight size={16} className="shrink-0 text-muted-foreground" aria-hidden />
      </Link>

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
