import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getShareLinksHub } from "@/lib/meetings/share-hub";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const RevokeSchema = z.object({
  action: z.literal("revoke"),
  id: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const includeInactive = request.nextUrl.searchParams.get("status") === "expirados";
  const hub = await getShareLinksHub(supabase, { includeInactive });
  return NextResponse.json(hub);
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const parsed = RevokeSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("share_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
