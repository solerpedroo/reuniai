"use client";

import { CalendarCheck, CheckSquare, Clock, VideoCamera } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { fadeUp, staggerContainer } from "@/components/motion/presets";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardStats } from "@/lib/meetings/queries";
import { formatHours, formatMeetingTime } from "@/lib/meetings/types";

type Kpi = {
  label: string;
  value: string;
  detail: string;
  icon: Icon;
};

function buildKpis(stats: DashboardStats): Kpi[] {
  const delta = stats.meetingsThisMonth - stats.meetingsLastMonth;
  const deltaLabel =
    delta === 0
      ? "Igual ao mês anterior"
      : `${delta > 0 ? "+" : ""}${delta} vs mês anterior`;

  return [
    {
      label: "Reuniões este mês",
      value: String(stats.meetingsThisMonth),
      detail: deltaLabel,
      icon: CalendarCheck,
    },
    {
      label: "Horas gravadas",
      value: stats.hoursRecordedMs > 0 ? formatHours(stats.hoursRecordedMs) : "0h",
      detail: "Total processado",
      icon: Clock,
    },
    {
      label: "Action items abertos",
      value: String(stats.openActionItems),
      detail: "Pendentes de conclusão",
      icon: CheckSquare,
    },
    {
      label: "Próxima reunião",
      value: stats.nextMeeting ? formatMeetingTime(stats.nextMeeting.started_at) : "—",
      detail: stats.nextMeeting?.title ?? "Nenhuma agendada",
      icon: VideoCamera,
    },
  ];
}

export function KpiCards({ stats }: { stats: DashboardStats }) {
  const kpis = buildKpis(stats);

  return (
    <motion.div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {kpis.map((kpi) => {
        const Glyph = kpi.icon;
        return (
          <motion.div key={kpi.label} variants={fadeUp}>
            <Card className="hover-lift h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription>{kpi.label}</CardDescription>
                  <Glyph size={18} className="text-muted-foreground/70" aria-hidden />
                </div>
                <CardTitle className="text-3xl tabular-nums tracking-tight">{kpi.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="truncate text-xs text-muted-foreground" title={kpi.detail}>
                  {kpi.detail}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
