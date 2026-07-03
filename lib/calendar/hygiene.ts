import "server-only";

import { decryptToken } from "@/lib/crypto/token-encrypt";
import { listCalendarEvents, refreshAccessToken } from "@/lib/calendar/google";
import { generateJson } from "@/lib/llm/client";
import { isLlmConfigured } from "@/lib/llm/client";
import type { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

type AdminClient = ReturnType<typeof createAdminClient>;

export type CalendarHygieneReport = {
  weekHours: number;
  meetingCount: number;
  recurringCount: number;
  withoutAgendaHint: number;
  backToBackBlocks: number;
  loadScore: number;
  suggestions: { title: string; detail: string; severity: "low" | "medium" | "high" }[];
};

const SuggestionsSchema = z.object({
  suggestions: z
    .array(
      z.object({
        title: z.string(),
        detail: z.string(),
        severity: z.enum(["low", "medium", "high"]).default("medium"),
      })
    )
    .default([]),
});

function eventDurationHours(start: string, end: string | null): number {
  const a = Date.parse(start);
  const b = end ? Date.parse(end) : a + 3_600_000;
  return Math.max(0, (b - a) / 3_600_000);
}

export async function analyzeCalendarHygiene(
  admin: AdminClient,
  userId: string
): Promise<CalendarHygieneReport> {
  const { data: connection } = await admin
    .from("calendar_connections")
    .select("refresh_token_encrypted, provider")
    .eq("user_id", userId)
    .eq("provider", "google")
    .maybeSingle<{ refresh_token_encrypted: string; provider: string }>();

  if (!connection) {
    return {
      weekHours: 0,
      meetingCount: 0,
      recurringCount: 0,
      withoutAgendaHint: 0,
      backToBackBlocks: 0,
      loadScore: 0,
      suggestions: [
        {
          title: "Conecte o Google Calendar",
          detail: "Vá em Configurações e conecte seu calendário para analisar a carga de reuniões.",
          severity: "medium",
        },
      ],
    };
  }

  const accessToken = await refreshAccessToken(decryptToken(connection.refresh_token_encrypted));
  const now = Date.now();
  const timeMin = new Date(now).toISOString();
  const timeMax = new Date(now + 7 * 86_400_000).toISOString();
  const events = await listCalendarEvents(accessToken, timeMin, timeMax);

  const active = events.filter((e) => e.status !== "cancelled");
  let weekHours = 0;
  let recurringCount = 0;
  let withoutAgendaHint = 0;
  const timedEvents: { start: number; end: number; title: string }[] = [];

  for (const event of active) {
    const start = event.start?.dateTime ?? event.start?.date;
    const end = event.end?.dateTime ?? event.end?.date;
    if (!start) continue;

    weekHours += eventDurationHours(start, end ?? null);
    if (event.recurringEventId) recurringCount += 1;
    const desc = `${event.description ?? ""} ${event.summary ?? ""}`.toLowerCase();
    if (!desc.includes("pauta") && !desc.includes("agenda") && desc.length < 40) {
      withoutAgendaHint += 1;
    }

    timedEvents.push({
      start: Date.parse(start),
      end: end ? Date.parse(end) : Date.parse(start) + 3_600_000,
      title: event.summary?.trim() || "Sem título",
    });
  }

  timedEvents.sort((a, b) => a.start - b.start);
  let backToBackBlocks = 0;
  for (let i = 1; i < timedEvents.length; i += 1) {
    const gapMin = (timedEvents[i].start - timedEvents[i - 1].end) / 60_000;
    if (gapMin >= 0 && gapMin < 5) backToBackBlocks += 1;
  }

  const meetingCount = active.length;
  const loadScore = Math.min(
    100,
    Math.round(weekHours * 8 + recurringCount * 3 + backToBackBlocks * 5)
  );

  const baseSuggestions: CalendarHygieneReport["suggestions"] = [];
  if (weekHours > 25) {
    baseSuggestions.push({
      title: "Semana sobrecarregada",
      detail: `${weekHours.toFixed(1)}h de eventos nos próximos 7 dias — considere recusar ou encurtar calls.`,
      severity: "high",
    });
  }
  if (backToBackBlocks >= 3) {
    baseSuggestions.push({
      title: "Muitas reuniões seguidas",
      detail: `${backToBackBlocks} transições com menos de 5 min de intervalo.`,
      severity: "medium",
    });
  }
  if (withoutAgendaHint >= 3) {
    baseSuggestions.push({
      title: "Eventos sem pauta aparente",
      detail: `${withoutAgendaHint} eventos sem descrição/pauta — peça agenda antes ou proponha async.`,
      severity: "low",
    });
  }

  let llmSuggestions: CalendarHygieneReport["suggestions"] = [];
  if (isLlmConfigured() && timedEvents.length > 0) {
    try {
      const raw = await generateJson({
        system: "Você é coach de produtividade. Sugira 2-3 ações concretas para reduzir reuniões desnecessárias. PT-BR.",
        user: JSON.stringify({
          weekHours,
          meetingCount,
          recurringCount,
          sampleTitles: timedEvents.slice(0, 15).map((e) => e.title),
        }),
      });
      llmSuggestions = SuggestionsSchema.parse(raw).suggestions;
    } catch {
      /* non-blocking */
    }
  }

  return {
    weekHours: Math.round(weekHours * 10) / 10,
    meetingCount,
    recurringCount,
    withoutAgendaHint,
    backToBackBlocks,
    loadScore,
    suggestions: [...baseSuggestions, ...llmSuggestions].slice(0, 8),
  };
}
