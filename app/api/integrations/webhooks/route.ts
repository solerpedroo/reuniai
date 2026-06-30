import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { INTEGRATION_EVENTS } from "@/lib/integrations/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  url: z.string().url("URL inválida"),
  events: z.array(z.enum(["meeting.completed", "action_item.created"])).min(1),
  description: z.string().max(200).optional(),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("outbound_webhooks")
    .select("id, url, events, description, enabled, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ webhooks: data ?? [], available_events: INTEGRATION_EVENTS });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const parsed = CreateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const secret = randomBytes(32).toString("hex");
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("outbound_webhooks")
    .insert({
      user_id: user.id,
      url: parsed.data.url,
      secret,
      events: parsed.data.events,
      description: parsed.data.description ?? null,
    })
    .select("id, url, events, description, enabled, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, webhook: data, secret });
}
