import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { decryptToken } from "@/lib/crypto/token-encrypt";
import { deliverWebhook } from "@/lib/integrations/webhooks";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { notionFetch } from "@/lib/notion/oauth";
import { postSlackMessage } from "@/lib/slack/oauth";

export const dynamic = "force-dynamic";

const TestSchema = z.object({
  provider: z.enum(["slack", "notion", "webhook"]),
  id: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const parsed = TestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const admin = createAdminClient();

  if (parsed.data.provider === "slack") {
    const { data: row } = await admin
      .from("slack_connections")
      .select("bot_token_encrypted, channel_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!row?.channel_id) {
      return NextResponse.json({ error: "Slack não conectado ou sem canal" }, { status: 400 });
    }

    try {
      await postSlackMessage(
        decryptToken(row.bot_token_encrypted),
        row.channel_id,
        [
          {
            type: "section",
            text: { type: "mrkdwn", text: "✅ *Teste ReuniAI* — conexão Slack OK." },
          },
        ],
        "Teste ReuniAI — conexão Slack OK."
      );
      return NextResponse.json({ ok: true, message: "Mensagem de teste enviada ao Slack" });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Falha no teste Slack" },
        { status: 502 }
      );
    }
  }

  if (parsed.data.provider === "notion") {
    const { data: row } = await admin
      .from("notion_connections")
      .select("access_token_encrypted")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!row) {
      return NextResponse.json({ error: "Notion não conectado" }, { status: 400 });
    }

    const res = await notionFetch(decryptToken(row.access_token_encrypted), "/users/me");
    if (!res.ok) {
      return NextResponse.json({ error: "Falha ao validar token Notion" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, message: "Conexão Notion validada" });
  }

  if (!parsed.data.id) {
    return NextResponse.json({ error: "id do webhook obrigatório" }, { status: 400 });
  }

  const { data: hook } = await supabase
    .from("outbound_webhooks")
    .select("id, url, secret")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (!hook) {
    return NextResponse.json({ error: "Webhook não encontrado" }, { status: 404 });
  }

  const webhook = hook as { id: string; url: string; secret: string };

  const payload = {
    type: "connection_test",
    message: "ReuniAI test ping — sem dados de reunião",
    tested_at: new Date().toISOString(),
  };

  const result = await deliverWebhook(
    webhook.url,
    webhook.secret,
    "meeting.completed",
    payload as Record<string, unknown>
  );

  await admin.from("webhook_deliveries").insert({
    webhook_id: webhook.id,
    event: "meeting.completed",
    payload: payload as never,
    status: result.ok ? "delivered" : "failed",
    attempts: result.attempts,
    last_error: result.error ?? null,
    delivered_at: result.ok ? new Date().toISOString() : null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Falha no teste" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, message: "Webhook respondeu ao teste" });
}
