import { NextResponse } from "next/server";
import { z } from "zod";
import { distributeMeetingSummary } from "@/lib/meetings/participant-distribute";
import { EmailDeliveryError } from "@/lib/email/send";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  recipients: z.array(z.string().trim().min(3)).min(1).max(20),
  includeShareLink: z.boolean().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  try {
    const admin = createAdminClient();
    const result = await distributeMeetingSummary(admin, user.id, id, parsed.data);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof EmailDeliveryError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Falha ao distribuir.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
