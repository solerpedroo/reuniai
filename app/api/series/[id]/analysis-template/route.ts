import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ANALYSIS_TEMPLATE_IDS } from "@/lib/analysis/template-types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PutSchema = z.object({
  analysis_template: z.enum(ANALYSIS_TEMPLATE_IDS),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: recurringEventId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const parsed = PutSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Template inválido" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("series_analysis_defaults")
    .upsert(
      {
        user_id: user.id,
        calendar_recurring_event_id: decodeURIComponent(recurringEventId),
        analysis_template: parsed.data.analysis_template,
      },
      { onConflict: "user_id,calendar_recurring_event_id" }
    )
    .select("analysis_template")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, analysis_template: data.analysis_template });
}
