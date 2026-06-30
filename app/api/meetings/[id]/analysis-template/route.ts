import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ANALYSIS_TEMPLATE_IDS } from "@/lib/analysis/template-types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  analysis_template: z.enum(ANALYSIS_TEMPLATE_IDS).nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: meetingId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const parsed = PatchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Template inválido" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("meetings")
    .update({ analysis_template: parsed.data.analysis_template })
    .eq("id", meetingId)
    .eq("user_id", user.id)
    .select("analysis_template")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Reunião não encontrada" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, analysis_template: data.analysis_template });
}
