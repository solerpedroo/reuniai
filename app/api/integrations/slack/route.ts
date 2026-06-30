import { NextResponse } from "next/server";
import { z } from "zod";
import { decryptToken } from "@/lib/crypto/token-encrypt";
import { listSlackChannels } from "@/lib/slack/oauth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { SlackConnection } from "@/lib/workflow/types";

export const dynamic = "force-dynamic";

const ChannelSchema = z.object({
  channel_id: z.string().min(1),
  channel_name: z.string().optional(),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: connection } = await supabase
    .from("slack_connections")
    .select("team_name, channel_id, channel_name")
    .eq("user_id", user.id)
    .maybeSingle<Pick<SlackConnection, "team_name" | "channel_id" | "channel_name">>();

  if (!connection) return NextResponse.json({ connected: false });

  let channels: { id: string; name: string }[] = [];
  try {
    const admin = createAdminClient();
    const { data: row } = await admin
      .from("slack_connections")
      .select("bot_token_encrypted")
      .eq("user_id", user.id)
      .single();
    if (row) {
      channels = await listSlackChannels(decryptToken(row.bot_token_encrypted));
    }
  } catch {
    channels = [];
  }

  return NextResponse.json({
    connected: true,
    team_name: connection.team_name,
    channel_id: connection.channel_id,
    channel_name: connection.channel_name,
    channels,
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const parsed = ChannelSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "channel_id obrigatório" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("slack_connections")
    .update({
      channel_id: parsed.data.channel_id,
      channel_name: parsed.data.channel_name ?? null,
    })
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { error } = await supabase.from("slack_connections").delete().eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
