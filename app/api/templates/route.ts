import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  countSeriesUsingTemplateSlug,
  createAnalysisTemplate,
  listAnalysisTemplates,
} from "@/lib/analysis/template-library";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(400).nullable().optional(),
  sourceSlug: z.string().optional(),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const templates = await listAnalysisTemplates(supabase);
  const withUsage = await Promise.all(
    templates.map(async (template) => ({
      ...template,
      seriesCount: await countSeriesUsingTemplateSlug(supabase, template.slug),
    }))
  );

  return NextResponse.json({ templates: withUsage });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const parsed = CreateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const admin = createAdminClient();
  const template = await createAnalysisTemplate(admin, user.id, parsed.data);
  return NextResponse.json({ template }, { status: 201 });
}
