import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import type { AssistantScope } from "@/lib/assistant/types";
import { generateJson, isLlmConfigured } from "@/lib/llm/client";
import {
  buildGlobalContext,
  formatGlobalContextForPrompt,
} from "@/lib/rag/global-context";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ScopeSchema = z.object({
  type: z.enum(["all", "recent", "series", "participant"]),
  seriesId: z.string().optional(),
  participantKey: z.string().optional(),
  days: z.number().int().min(1).max(365).optional(),
});

const BodySchema = z.object({
  message: z.string().trim().min(1).max(2000),
  scope: ScopeSchema.optional(),
  includeParticipantNotes: z.boolean().optional(),
});

const AnswerSchema = z.object({
  answer: z.string(),
  citations: z.array(z.number()).default([]),
});

const SYSTEM_PROMPT = [
  "Você é um assistente que responde perguntas sobre MÚLTIPLAS reuniões do usuário, em português do Brasil.",
  "Use SOMENTE o contexto fornecido (trechos numerados e notas de participante, se houver).",
  "Nunca invente informações. Se não houver evidência, diga que não encontrou.",
  "Cite trechos pelos números (#) no campo citations.",
  "Notas pessoais de reunião NÃO estão no contexto — não as mencione.",
].join(" ");

export async function POST(request: NextRequest) {
  if (!isLlmConfigured()) {
    return NextResponse.json({ error: "Nenhum provedor de IA configurado." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (isRateLimited({ key: `assistant:${user.id}`, ...RATE_LIMITS.assistant })) {
    const { error, status } = rateLimitResponse("Muitas mensagens em pouco tempo. Aguarde um instante.");
    return NextResponse.json({ error }, { status });
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const scope: AssistantScope = parsed.data.scope ?? { type: "all" };
  const context = await buildGlobalContext(supabase, parsed.data.message, scope, {
    includeParticipantNotes: parsed.data.includeParticipantNotes ?? false,
  });

  if (context.segments.length === 0 && context.participantNotes.length === 0) {
    return NextResponse.json(
      { error: "Nenhum contexto encontrado para esta pergunta no escopo selecionado." },
      { status: 400 }
    );
  }

  const userPrompt = [
    formatGlobalContextForPrompt(context),
    "",
    `Pergunta: ${parsed.data.message}`,
    "",
    'Responda em JSON: { "answer": "...", "citations": [índices dos trechos usados] }',
  ].join("\n");

  try {
    const raw = await generateJson({ system: SYSTEM_PROMPT, user: userPrompt });
    const result = AnswerSchema.parse(raw);

    const citations = result.citations
      .filter((i) => i >= 0 && i < context.segments.length)
      .slice(0, 8)
      .map((i) => {
        const segment = context.segments[i]!;
        return {
          meeting_id: segment.meetingId,
          meeting_title: segment.meetingTitle,
          start_ms: segment.startMs,
          text: segment.text,
        };
      });

    return NextResponse.json({ content: result.answer, citations });
  } catch (err) {
    console.error("[assistant/chat]", err);
    return NextResponse.json({ error: "Falha ao gerar resposta." }, { status: 500 });
  }
}
