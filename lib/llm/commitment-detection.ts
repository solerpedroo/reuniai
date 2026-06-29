import "server-only";

import { z } from "zod";
import { generateJson } from "@/lib/llm/client";

export const CommitmentDetectionSchema = z.object({
  commitments: z
    .array(
      z.object({
        title: z.string().max(500),
        assignee: z.string().nullable().default(null),
        due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        source_quote: z.string().max(300).optional(),
      })
    )
    .default([]),
});

export type CommitmentDetection = z.infer<typeof CommitmentDetectionSchema>;

const SYSTEM_PROMPT = [
  "Você analisa transcrições de reuniões em português do Brasil e detecta compromissos temporais.",
  "Foque em frases onde alguém se compromete a fazer algo até uma data relativa ou absoluta.",
  'Exemplos: "mando na sexta", "até amanhã", "envio o relatório semana que vem", "te retorno na segunda".',
  "Infira due_date em ISO (YYYY-MM-DD) com base na data de referência da reunião.",
  "NÃO repita action items já extraídos na primeira passada.",
  "NÃO invente compromissos que não estejam na transcrição.",
  "assignee só quando a transcrição indicar claramente quem se comprometeu; caso contrário, null.",
].join(" ");

const MAX_TRANSCRIPT_CHARS = 100_000;

type DetectInput = {
  transcript: string;
  meetingTitle: string;
  referenceDateIso: string;
  existingActionItemTitles: string[];
};

export async function detectCommitments(input: DetectInput): Promise<CommitmentDetection> {
  const transcript =
    input.transcript.length > MAX_TRANSCRIPT_CHARS
      ? input.transcript.slice(-MAX_TRANSCRIPT_CHARS)
      : input.transcript;

  const existing =
    input.existingActionItemTitles.length > 0
      ? `Action items já extraídos (NÃO repetir):\n${input.existingActionItemTitles.map((t) => `- ${t}`).join("\n")}`
      : "Nenhum action item extraído ainda.";

  const user = [
    `Reunião: ${input.meetingTitle}`,
    `Data de referência (para inferir prazos relativos): ${input.referenceDateIso.slice(0, 10)}`,
    existing,
    "",
    "Transcrição:",
    transcript,
    "",
    'Retorne JSON: { "commitments": [{ "title": "tarefa", "assignee": "nome ou null", "due_date": "YYYY-MM-DD", "source_quote": "trecho opcional" }] }',
  ].join("\n");

  const raw = await generateJson({ system: SYSTEM_PROMPT, user });
  return CommitmentDetectionSchema.parse(raw);
}
