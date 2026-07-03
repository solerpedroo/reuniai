import "server-only";

import { computeCompletionRate } from "@/lib/decisions/outcomes";
import type { DecisionOutcomeRow } from "@/lib/decisions/outcome-types";
import {
  getInsightsForPeriod,
  periodToRange,
} from "@/lib/insights/period-stats";
import { generateText, isLlmConfigured } from "@/lib/llm/client";
import { formatHours } from "@/lib/meetings/types";
import type { createClient } from "@/lib/supabase/server";
import type { ImpactPeriod, PersonalImpactReport } from "@/lib/impact/personal-impact-types";

export type { ImpactPeriod, PersonalImpactReport } from "@/lib/impact/personal-impact-types";
export { IMPACT_PERIODS, parseImpactPeriod } from "@/lib/impact/personal-impact-types";

type Client = Awaited<ReturnType<typeof createClient>>;

export async function getPersonalImpact(
  supabase: Client,
  period: ImpactPeriod,
  now = new Date()
): Promise<PersonalImpactReport> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const emptyInsights = await getInsightsForPeriod(supabase, period, now);
  if (!user) {
    return {
      period,
      insights: emptyInsights,
      avgCoachScore: null,
      commitmentsFulfilledRate: null,
      decisionsDoneRate: null,
      followUpsSent: 0,
      narrative: null,
    };
  }

  const { start, end } = periodToRange(period, now);

  const { data: meetingsInPeriod } = await supabase
    .from("meetings")
    .select("id")
    .eq("user_id", user.id)
    .gte("started_at", start.toISOString())
    .lte("started_at", end.toISOString());

  const periodMeetingIds = ((meetingsInPeriod ?? []) as { id: string }[]).map((m) => m.id);

  const [insights, coachRes, commitmentsRes, outcomesRes, followUpsRes] = await Promise.all([
    getInsightsForPeriod(supabase, period, now),
    periodMeetingIds.length > 0
      ? supabase
          .from("meeting_coach_reports")
          .select("score")
          .in("meeting_id", periodMeetingIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("verbal_commitments")
      .select("status")
      .eq("user_id", user.id)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString()),
    supabase.from("decision_outcomes").select("*").eq("user_id", user.id),
    supabase
      .from("meeting_follow_ups")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .not("sent_at", "is", null)
      .gte("sent_at", start.toISOString())
      .lte("sent_at", end.toISOString()),
  ]);

  const coachScores = (coachRes.data ?? [])
    .map((row) => (row as { score: number | null }).score)
    .filter((score): score is number => score != null);

  const avgCoachScore =
    coachScores.length > 0
      ? Math.round(coachScores.reduce((a, b) => a + b, 0) / coachScores.length)
      : null;

  const commitments = (commitmentsRes.data ?? []) as { status: string }[];
  const fulfilled = commitments.filter((c) => c.status === "fulfilled").length;
  const commitmentsFulfilledRate =
    commitments.length > 0 ? Math.round((fulfilled / commitments.length) * 100) : null;

  const { rate: decisionsDoneRate } = computeCompletionRate(
    (outcomesRes.data ?? []) as DecisionOutcomeRow[]
  );

  const report: PersonalImpactReport = {
    period,
    insights,
    avgCoachScore,
    commitmentsFulfilledRate,
    decisionsDoneRate,
    followUpsSent: followUpsRes.count ?? 0,
    narrative: null,
  };

  if (isLlmConfigured() && insights.meetingCount > 0) {
    try {
      const narrative = await generateText({
        system:
          "Você escreve retrospectivas pessoais curtas em PT-BR sobre produtividade em reuniões. Tom direto, 2-3 frases, sem markdown.",
        user: JSON.stringify({
          period,
          meetingHours: formatHours(insights.hoursRecordedMs),
          meetings: insights.meetingCount,
          taskCompletionRate: insights.taskCompletionRate,
          coachScore: avgCoachScore,
          commitmentsFulfilledRate,
          decisionsDoneRate,
          followUpsSent: followUpsRes.count ?? 0,
        }),
        timeoutMs: 20_000,
      });
      report.narrative = narrative.trim();
    } catch {
      /* non-blocking */
    }
  }

  return report;
}
