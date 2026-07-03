import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  status: z.enum(["pending", "fulfilled", "overdue", "disputed"]),
});

export async function PATCH(
  request: NextRequest,
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

  const parsed = PatchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const { data: existing } = await supabase
    .from("verbal_commitments")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle<{ id: string; user_id: string }>();

  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: "Compromisso não encontrado" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("verbal_commitments")
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "Falha ao atualizar compromisso" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, commitment: data });
}
