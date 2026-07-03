import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isLlmConfigured } from "@/lib/llm/client";
import {
  generateRehearsalSummary,
  generateRehearsalTurn,
  RehearsalMessageSchema,
} from "@/lib/rehearsal/chat";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BodySchema = z.object({
  rehearsalId: z.string().uuid().optional(),
  scenario: z.string().trim().min(1).max(2000),
  participantKey: z.string().max(500).optional(),
  message: z.string().trim().min(1).max(2000),
  messages: z.array(RehearsalMessageSchema).max(40).default([]),
  endSession: z.boolean().optional(),
});

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

  if (isRateLimited({ key: `rehearsal:${user.id}`, ...RATE_LIMITS.assistant })) {
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

  const userMessages: { role: "user" | "assistant"; content: string }[] = [
    ...parsed.data.messages,
    { role: "user", content: parsed.data.message },
  ];

  try {
    const turn = await generateRehearsalTurn({
      scenario: parsed.data.scenario,
      participantLabel: parsed.data.participantKey,
      messages: parsed.data.messages,
      userMessage: parsed.data.message,
    });

    const allMessages = [...userMessages, { role: "assistant" as const, content: turn.reply }];

    let feedbackSummary: string | null = null;
    if (parsed.data.endSession) {
      feedbackSummary = await generateRehearsalSummary({
        scenario: parsed.data.scenario,
        messages: allMessages,
      });
    }

    const admin = createAdminClient();
    const payload = {
      user_id: user.id,
      participant_key: parsed.data.participantKey ?? null,
      scenario: parsed.data.scenario,
      messages: allMessages,
      feedback: parsed.data.endSession
        ? { summary: feedbackSummary, lastTip: turn.feedback?.tip ?? null }
        : turn.feedback ?? null,
      updated_at: new Date().toISOString(),
    };

    let rehearsalId = parsed.data.rehearsalId;

    if (rehearsalId) {
      const { data: existing } = await admin
        .from("conversation_rehearsals")
        .select("id, user_id")
        .eq("id", rehearsalId)
        .maybeSingle();

      if (!existing || existing.user_id !== user.id) {
        return NextResponse.json({ error: "Ensaio não encontrado" }, { status: 404 });
      }

      await admin.from("conversation_rehearsals").update(payload).eq("id", rehearsalId);
    } else {
      const { data: created, error } = await admin
        .from("conversation_rehearsals")
        .insert(payload)
        .select("id")
        .single();

      if (error || !created) {
        return NextResponse.json({ error: "Falha ao salvar ensaio" }, { status: 500 });
      }
      rehearsalId = created.id;
    }

    return NextResponse.json({
      rehearsalId,
      reply: turn.reply,
      feedback: turn.feedback ?? null,
      summary: feedbackSummary,
      messages: allMessages,
    });
  } catch (err) {
    console.error("[rehearsal/chat]", err);
    return NextResponse.json({ error: "Falha ao gerar resposta." }, { status: 500 });
  }
}
