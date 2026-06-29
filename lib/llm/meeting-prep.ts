import "server-only";

import { z } from "zod";
import { generateJson } from "@/lib/llm/client";

export const MeetingPrepSchema = z.object({
  briefing: z.string().max(3000),
});

export type MeetingPrepBriefing = z.infer<typeof MeetingPrepSchema>;

type PrepInput = {
  upcomingTitle: string;
  upcomingStartsAt: string;
  relatedMeetingTitle?: string | null;
  relatedSummary?: string | null;
  openActionItems: { title: string; assignee: string | null }[];
  participantOverlap: string[];
};

export async function generateMeetingPrep(input: PrepInput): Promise<MeetingPrepBriefing> {
  const user = [
    `Próxima reunião: ${input.upcomingTitle}`,
    `Horário: ${input.upcomingStartsAt}`,
    input.participantOverlap.length > 0
      ? `Participantes em comum com reuniões anteriores: ${input.participantOverlap.join(", ")}`
      : null,
    input.relatedMeetingTitle ? `Última reunião similar: ${input.relatedMeetingTitle}` : null,
    input.relatedSummary ? `Resumo da última: ${input.relatedSummary}` : null,
    input.openActionItems.length > 0
      ? `Action items em aberto:\n${input.openActionItems
          .map((item) => `- ${item.title}${item.assignee ? ` (${item.assignee})` : ""}`)
          .join("\n")}`
      : "Nenhum action item em aberto identificado.",
    "",
    'Retorne JSON: { "briefing": "briefing em 3-6 frases para preparar o usuário" }',
  ]
    .filter(Boolean)
    .join("\n");

  const system = [
    "Você gera briefings curtos de preparação para reuniões em português do Brasil.",
    "Destaque decisões pendentes, action items abertos e contexto da última call com o mesmo grupo.",
    "Não invente informações.",
  ].join(" ");

  const raw = await generateJson({ system, user });
  return MeetingPrepSchema.parse(raw);
}
