import "server-only";

import { z } from "zod";
import { generateJson } from "@/lib/llm/client";

export const PROMPT_VERSION = "v1";

export const MeetingAnalysisSchema = z.object({
  executive_summary: z.string().max(2000),
  topics: z
    .array(
      z.object({
        title: z.string(),
        summary: z.string(),
      })
    )
    .default([]),
  decisions: z.array(z.string()).default([]),
  action_items: z
    .array(
      z.object({
        title: z.string(),
        assignee: z.string().nullable().default(null),
        due_date: z.string().nullable().default(null),
      })
    )
    .default([]),
});

export type MeetingAnalysis = z.infer<typeof MeetingAnalysisSchema>;

const SYSTEM_PROMPT = [
  "Você é um assistente que analisa transcrições de reuniões em português do Brasil.",
  "Produza um resumo fiel ao conteúdo. NÃO invente informações, nomes ou datas.",
  "Se algo não estiver claro na transcrição, omita em vez de supor.",
  "Datas de action items devem ser ISO (YYYY-MM-DD) e apenas quando explicitamente mencionadas; caso contrário, null.",
  "Responsável (assignee) só quando a transcrição indicar claramente; caso contrário, null.",
].join(" ");

const OUTPUT_SPEC = `Retorne um objeto JSON com EXATAMENTE este formato:
{
  "executive_summary": "resumo executivo em 2-5 frases",
  "topics": [{ "title": "tópico", "summary": "o que foi discutido" }],
  "decisions": ["decisão 1", "decisão 2"],
  "action_items": [{ "title": "tarefa", "assignee": "nome ou null", "due_date": "YYYY-MM-DD ou null" }]
}`;

/** Limite defensivo de caracteres enviados ao LLM. */
const MAX_TRANSCRIPT_CHARS = 100_000;

export async function analyzeMeeting(
  transcript: string,
  meetingTitle?: string
): Promise<MeetingAnalysis> {
  const trimmed =
    transcript.length > MAX_TRANSCRIPT_CHARS
      ? transcript.slice(0, MAX_TRANSCRIPT_CHARS)
      : transcript;

  const user = [
    meetingTitle ? `Título da reunião: ${meetingTitle}` : null,
    OUTPUT_SPEC,
    "",
    "Transcrição:",
    trimmed,
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await generateJson({ system: SYSTEM_PROMPT, user });
  return MeetingAnalysisSchema.parse(raw);
}
