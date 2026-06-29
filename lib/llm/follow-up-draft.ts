import "server-only";

import { z } from "zod";
import { generateJson } from "@/lib/llm/client";

export const FollowUpDraftSchema = z.object({
  subject: z.string().max(200),
  body: z.string().max(8000),
});

export type FollowUpDraft = z.infer<typeof FollowUpDraftSchema>;

const SYSTEM_PROMPT = [
  "Você redige emails de follow-up profissionais em português do Brasil após reuniões.",
  "Tom cordial e objetivo. Não invente decisões ou compromissos que não estejam nos dados.",
  "Estrutura: agradecimento breve, decisões tomadas, action items com responsáveis, próximos passos.",
].join(" ");

type FollowUpInput = {
  meetingTitle: string;
  executiveSummary?: string | null;
  decisions: string[];
  actionItems: { title: string; assignee: string | null; due_date: string | null }[];
};

export async function generateFollowUpDraft(input: FollowUpInput): Promise<FollowUpDraft> {
  const user = [
    `Reunião: ${input.meetingTitle}`,
    input.executiveSummary ? `Resumo: ${input.executiveSummary}` : null,
    input.decisions.length > 0 ? `Decisões:\n${input.decisions.map((d) => `- ${d}`).join("\n")}` : null,
    input.actionItems.length > 0
      ? `Action items:\n${input.actionItems
          .map((item) => {
            const assignee = item.assignee ? ` (${item.assignee})` : "";
            const due = item.due_date ? ` [prazo: ${item.due_date}]` : "";
            return `- ${item.title}${assignee}${due}`;
          })
          .join("\n")}`
      : null,
    "",
    'Retorne JSON: { "subject": "assunto do email", "body": "corpo em texto plano com parágrafos separados por \\n\\n" }',
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await generateJson({ system: SYSTEM_PROMPT, user });
  return FollowUpDraftSchema.parse(raw);
}
