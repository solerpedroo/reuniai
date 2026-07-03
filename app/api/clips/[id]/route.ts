import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { extendMeetingClip, revokeMeetingClip } from "@/lib/clips/clips";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  action: z.enum(["extend", "revoke"]),
  days: z.number().int().min(1).max(30).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clipId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

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

  const admin = createAdminClient();
  const ok =
    parsed.data.action === "revoke"
      ? await revokeMeetingClip(admin, user.id, clipId)
      : await extendMeetingClip(admin, user.id, clipId, parsed.data.days ?? 7);

  if (!ok) {
    return NextResponse.json({ error: "Falha ao atualizar clip" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
