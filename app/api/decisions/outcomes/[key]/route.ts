import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { updateOutcomeStatus } from "@/lib/decisions/outcomes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  status: z.enum(["pending", "in_progress", "done", "reversed"]),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ key: string }> }
) {
  const { key } = await context.params;
  const decisionKey = decodeURIComponent(key);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const result = await updateOutcomeStatus(
    admin,
    user.id,
    decisionKey,
    parsed.data.status
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
