"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeeklyMeetingCount } from "@/lib/meetings/queries";

export function MeetingsChart({ data }: { data: WeeklyMeetingCount[] }) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="surface-card overflow-hidden">
      <div className="border-b border-border/70 px-5 py-4">
        <h2 className="text-sm font-semibold">Atividade semanal</h2>
        <p className="text-xs text-muted-foreground">
          {total > 0
            ? `${total} reuniões nas últimas ${data.length} semanas`
            : "Nenhuma reunião registrada no período"}
        </p>
      </div>

      <div className="h-56 px-2 py-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 12, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="weekLabel"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "color-mix(in oklab, var(--brand) 8%, transparent)" }}
              contentStyle={{
                borderRadius: "0.625rem",
                border: "1px solid color-mix(in oklab, var(--border) 80%, transparent)",
                background: "color-mix(in oklab, var(--background) 92%, transparent)",
                fontSize: "12px",
              }}
              formatter={(value: number) => [`${value} reuniões`, "Total"]}
              labelFormatter={(label) => `Semana de ${label}`}
            />
            <Bar dataKey="count" fill="var(--brand)" radius={[6, 6, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
