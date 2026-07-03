import "server-only";

import { z } from "zod";
import { generateJson } from "@/lib/llm/client";

export const VerbalLedgerSchema = z.object({
  commitments: z
    .array(
      z.object({
        text: z.string().max(500),
        direction: z.enum(["i_owe", "they_owe", "mutual"]),
        counterparty: z.string().max(200).nullable().default(null),
        due_date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable()
          .default(null),
        source_quote: z.string().max(300).optional(),
      })
    )
    .default([]),
});

export type VerbalLedgerExtraction = z.infer<typeof VerbalLedgerSchema>;

const SYSTEM_PROMPT = [
  "Você analisa transcrições de reuniões em português do Brasil e extrai compromissos verbais.",
  "Compromisso verbal = promessa explícita entre pessoas, com direção clara:",
  '- "i_owe": o usuário/host da reunião se compromete a fazer algo',
  '- "they_owe": outra pessoa se compromete a fazer algo para o usuário',
  '- "mutual": compromisso recíproco ou compartilhado',
  "NÃO inclua tarefas genéricas de action items — foque em promessas interpessoais.",
  "Infira due_date (YYYY-MM-DD) quando houver prazo relativo ou absoluto; senão null.",
  "NÃO invente compromissos ausentes na transcrição.",
].join(" ");

const MAX_TRANSCRIPT_CHARS = 100_000;

type ExtractInput = {
  transcript: string;
  meetingTitle: string;
  referenceDateIso: string;
};

export async function extractVerbalCommitments(input: ExtractInput): Promise<VerbalLedgerExtraction> {
  const transcript =
    input.transcript.length > MAX_TRANSCRIPT_CHARS
      ? input.transcript.slice(-MAX_TRANSCRIPT_CHARS)
      : input.transcript;

  const user = [
    `Reunião: ${input.meetingTitle}`,
    `Data de referência: ${input.referenceDateIso.slice(0, 10)}`,
    "",
    "Transcrição:",
    transcript,
    "",
    'Retorne JSON: { "commitments": [{ "text": "...", "direction": "i_owe|they_owe|mutual", "counterparty": "nome ou null", "due_date": "YYYY-MM-DD ou null", "source_quote": "trecho opcional" }] }',
  ].join("\n");

  const raw = await generateJson({ system: SYSTEM_PROMPT, user });
  return VerbalLedgerSchema.parse(raw);
}
