import type { PeriodInsights } from "@/lib/insights/period-stats";

export type ImpactPeriod = "7d" | "30d" | "90d";

export const IMPACT_PERIODS: { value: ImpactPeriod; label: string }[] = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
];

export type PersonalImpactReport = {
  period: ImpactPeriod;
  insights: PeriodInsights;
  avgCoachScore: number | null;
  commitmentsFulfilledRate: number | null;
  decisionsDoneRate: number | null;
  followUpsSent: number;
  narrative: string | null;
};

export function parseImpactPeriod(value: string | undefined): ImpactPeriod {
  if (value === "7d" || value === "30d" || value === "90d") return value;
  return "30d";
}
