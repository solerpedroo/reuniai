import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { generateJson, isLlmConfigured } from "@/lib/llm/client";
import { formatTimestamp } from "@/lib/meetings/transcript";
import type { Citation } from "@/lib/meetings/chat";
import { buildMeetingContext } from "@/lib/rag/meeting-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BodySchema = z.object({
  message: z.string().trim().min(1, "Mensagem vazia").max(2000),
});

const AnswerSchema = z.object({
  answer: z.string(),
  citations: z.array(z.number()).default([]),
});

const SYSTEM_PROMPT = [
  "Você é um assistente que responde perguntas sobre UMA reunião específica, em português do Brasil.",
  "Use SOMENTE as informações do contexto fornecido (resumo + trechos da transcrição).",
  "Se a resposta não estiver no contexto, diga que não encontrou essa informação na reunião.",
  "Cite os trechos usados pelos seus números (#) no campo citations.",
].join(" ");

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: meetingId } = await params;

  if (!isLlmConfigured()) {
    return NextResponse.json(
      { error: "Nenhum provedor de IA configurado." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (isRateLimited({ key: `chat:${user.id}`, ...RATE_LIMITS.chat })) {
    const { error, status } = rateLimitResponse("Muitas mensagens em pouco tempo. Aguarde um instante.");
    return NextResponse.json({ error }, { status });
  }

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, user_id")
    .eq("id", meetingId)
    .maybeSingle<{ id: string; user_id: string }>();

  if (!meeting || meeting.user_id !== user.id) {
    return NextResponse.json({ error: "Reunião não encontrada" }, { status: 404 });
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }
  const question = parsed.data.message;

  const context = await buildMeetingContext(supabase, meetingId, question);

  if (context.segments.length === 0) {
    return NextResponse.json(
      { error: "Esta reunião ainda não tem transcrição para consultar." },
      { status: 400 }
    );
  }

  const numbered = context.segments
    .map((s, i) => `[#${i} ${formatTimestamp(s.start_ms)}] ${s.speaker_label}: ${s.text}`)
    .join("\n");

  const userPrompt = [
    context.summary ? `Resumo da reunião:\n${context.summary}\n` : "",
    "Trechos da transcrição (numerados):",
    numbered,
    "",
    `Pergunta: ${question}`,
    "",
    'Responda em JSON: { "answer": "...", "citations": [números dos trechos usados] }',
  ]
    .filter(Boolean)
    .join("\n");

  let answer: string;
  let citations: Citation[];

  try {
    const raw = await generateJson({ system: SYSTEM_PROMPT, user: userPrompt });
    const result = AnswerSchema.parse(raw);
    answer = result.answer;
    citations = result.citations
      .filter((i) => i >= 0 && i < context.segments.length)
      .slice(0, 8)
      .map((i) => ({
        start_ms: context.segments[i].start_ms,
        text: context.segments[i].text,
      }));
  } catch (err) {
    console.error("Falha no chat da reunião:", err);
    return NextResponse.json({ error: "Falha ao gerar resposta." }, { status: 500 });
  }

  // Persiste pergunta e resposta.
  const admin = createAdminClient();
  await admin.from("chat_messages").insert([
    { meeting_id: meetingId, user_id: user.id, role: "user", content: question, citations: [] },
    {
      meeting_id: meetingId,
      user_id: user.id,
      role: "assistant",
      content: answer,
      citations: citations as unknown as never,
    },
  ]);

  return NextResponse.json({ content: answer, citations });
}
