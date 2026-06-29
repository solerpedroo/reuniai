import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { generateJson, isLlmConfigured } from "@/lib/llm/client";
import { buildSeriesContext } from "@/lib/rag/series-context";
import { getMeetingsInSeries } from "@/lib/series/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BodySchema = z.object({
  message: z.string().trim().min(1).max(2000),
});

const AnswerSchema = z.object({
  answer: z.string(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const recurringEventId = decodeURIComponent(id);

  if (!isLlmConfigured()) {
    return NextResponse.json({ error: "IA não configurada" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Mensagem inválida" }, { status: 400 });
  }

  const meetings = await getMeetingsInSeries(supabase, recurringEventId);
  if (meetings.length === 0) {
    return NextResponse.json({ error: "Série não encontrada" }, { status: 404 });
  }

  const context = await buildSeriesContext(supabase, meetings);

  const raw = await generateJson({
    system: [
      "Você responde perguntas sobre uma SÉRIE de reuniões recorrentes em português do Brasil.",
      "Use apenas o contexto fornecido. Compare ocorrências quando relevante.",
      'Retorne JSON: { "answer": "resposta em markdown simples" }',
    ].join(" "),
    user: `Contexto da série:\n${context}\n\nPergunta: ${parsed.data.message}`,
  });

  const answer = AnswerSchema.parse(raw);
  return NextResponse.json(answer);
}
