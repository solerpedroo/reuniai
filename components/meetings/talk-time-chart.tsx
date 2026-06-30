"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SpeakerTalkTime } from "@/lib/meetings/talk-time";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function TalkTimeChart({ data }: { data: SpeakerTalkTime[] }) {
  if (data.length === 0) return null;

  const chartData = data.map((item) => ({
    speaker: item.speaker,
    percentage: item.percentage,
    words: item.wordCount,
    turns: item.turnCount,
  }));

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold tracking-tight">Tempo de fala</h3>
        <p className="text-xs text-muted-foreground">Participação por participante na reunião</p>
      </div>

      <div className="surface-card p-4">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis
                type="category"
                dataKey="speaker"
                width={100}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "color-mix(in oklab, var(--brand) 8%, transparent)" }}
                contentStyle={{
                  borderRadius: "0.625rem",
                  border: "1px solid color-mix(in oklab, var(--border) 80%, transparent)",
                  fontSize: "12px",
                }}
                formatter={(value: number, _name, item) => [
                  `${value}% · ${item.payload.words} palavras · ${item.payload.turns} turnos`,
                  "Participação",
                ]}
              />
              <Bar dataKey="percentage" radius={[0, 6, 6, 0]} barSize={18}>
                {chartData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
