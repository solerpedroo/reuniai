import "server-only";

import { z } from "zod";
import { generateJson } from "@/lib/llm/client";

export const CoachReportSchema = z.object({
  score: z.number().int().min(0).max(100),
  metrics: z
    .object({
      clarity: z.number().int().min(0).max(100).optional(),
      engagement: z.number().int().min(0).max(100).optional(),
      decisions: z.number().int().min(0).max(100).optional(),
      follow_through: z.number().int().min(0).max(100).optional(),
      balance: z.number().int().min(0).max(100).optional(),
    })
    .default({}),
  suggestions: z
    .array(
      z.object({
        title: z.string().max(200),
        detail: z.string().max(500),
        priority: z.enum(["high", "medium", "low"]).default("medium"),
      })
    )
    .default([]),
});

export type CoachReportExtraction = z.infer<typeof CoachReportSchema>;

const SYSTEM_PROMPT = [
  "Você é um coach de reuniões profissionais. Analise a transcrição em português do Brasil.",
  "Avalie clareza de objetivos, engajamento, decisões tomadas, follow-through e equilíbrio de fala.",
  "score = nota geral 0-100 da qualidade da reunião como ferramenta de trabalho.",
  "suggestions = 2-5 melhorias concretas e acionáveis para a próxima reunião similar.",
  "Seja construtivo, específico e baseado na transcrição — não invente fatos.",
].join(" ");

const MAX_TRANSCRIPT_CHARS = 80_000;

type AnalyzeInput = {
  transcript: string;
  meetingTitle: string;
  durationMinutes?: number | null;
};

export async function analyzeMeetingCoach(input: AnalyzeInput): Promise<CoachReportExtraction> {
  const transcript =
    input.transcript.length > MAX_TRANSCRIPT_CHARS
      ? input.transcript.slice(-MAX_TRANSCRIPT_CHARS)
      : input.transcript;

  const user = [
    `Reunião: ${input.meetingTitle}`,
    input.durationMinutes != null ? `Duração: ~${input.durationMinutes} min` : "",
    "",
    "Transcrição:",
    transcript,
    "",
    'Retorne JSON: { "score": 0-100, "metrics": { "clarity", "engagement", "decisions", "follow_through", "balance" }, "suggestions": [{ "title", "detail", "priority": "high|medium|low" }] }',
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await generateJson({ system: SYSTEM_PROMPT, user });
  return CoachReportSchema.parse(raw);
}
