import "server-only";

import { z } from "zod";
import { generateJson, generateText } from "@/lib/llm/client";

export type RehearsalMessage = {
  role: "user" | "assistant";
  content: string;
};

export const RehearsalTurnSchema = z.object({
  reply: z.string().max(2000),
  feedback: z
    .object({
      tip: z.string().max(500).optional(),
      tone: z.enum(["good", "neutral", "needs_work"]).optional(),
    })
    .optional(),
});

export type RehearsalTurn = z.infer<typeof RehearsalTurnSchema>;

const SYSTEM_PROMPT = [
  "Você simula um roleplay de conversa profissional em português do Brasil.",
  "Interpreta o papel da outra pessoa no cenário descrito.",
  "Responda de forma realista, concisa (2-4 frases) e desafiadora quando apropriado.",
  "Inclua feedback breve sobre a última fala do usuário quando relevante.",
].join(" ");

export async function generateRehearsalTurn(input: {
  scenario: string;
  participantLabel?: string;
  messages: RehearsalMessage[];
  userMessage: string;
}): Promise<RehearsalTurn> {
  const history = input.messages
    .map((m) => `${m.role === "user" ? "Usuário" : "Interlocutor"}: ${m.content}`)
    .join("\n");

  const user = [
    `Cenário: ${input.scenario}`,
    input.participantLabel ? `Interlocutor: ${input.participantLabel}` : "",
    "",
    history ? `Histórico:\n${history}\n` : "",
    `Usuário: ${input.userMessage}`,
    "",
    'Retorne JSON: { "reply": "resposta do interlocutor", "feedback": { "tip": "dica opcional", "tone": "good|neutral|needs_work" } }',
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await generateJson({ system: SYSTEM_PROMPT, user });
  return RehearsalTurnSchema.parse(raw);
}

export async function generateRehearsalSummary(input: {
  scenario: string;
  messages: RehearsalMessage[];
}): Promise<string> {
  const history = input.messages
    .map((m) => `${m.role === "user" ? "Usuário" : "Interlocutor"}: ${m.content}`)
    .join("\n");

  return generateText({
    system: "Resuma o ensaio de conversa em português do Brasil com 3-5 bullets: o que funcionou, o que melhorar e próximo passo.",
    user: `Cenário: ${input.scenario}\n\nConversa:\n${history}`,
  });
}

export const RehearsalMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(4000),
});
