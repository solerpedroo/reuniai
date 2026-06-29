import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = (await request.json()) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: "Subscription inválida" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    },
    { onConflict: "user_id,endpoint" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { endpoint?: string };

  if (!body.endpoint) {
    return NextResponse.json({ error: "endpoint obrigatório" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("push_subscriptions").delete().eq("endpoint", body.endpoint);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
