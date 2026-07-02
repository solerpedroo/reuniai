import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import type { TemplateSection } from "@/lib/analysis/template-catalog";
import {
  deleteAnalysisTemplate,
  getAnalysisTemplate,
  updateAnalysisTemplate,
} from "@/lib/analysis/template-library";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SectionSchema = z.object({
  id: z.string(),
  label: z.string(),
  enabled: z.boolean(),
  promptHint: z.string().optional(),
});

const PatchSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(400).nullable().optional(),
  sections: z.array(SectionSchema).optional(),
});

export async function GET(
  _request: NextRequest,
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

  const template = await getAnalysisTemplate(supabase, id);
  if (!template) {
    return NextResponse.json({ error: "Template não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ template });
}

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

  const existing = await getAnalysisTemplate(supabase, id);
  if (!existing) {
    return NextResponse.json({ error: "Template não encontrado" }, { status: 404 });
  }
  if (existing.is_builtin) {
    return NextResponse.json({ error: "Templates built-in não são editáveis" }, { status: 403 });
  }

  const parsed = PatchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const admin = createAdminClient();
  const template = await updateAnalysisTemplate(admin, user.id, existing.id, {
    ...parsed.data,
    sections: parsed.data.sections as TemplateSection[] | undefined,
  });

  return NextResponse.json({ template });
}

export async function DELETE(
  _request: NextRequest,
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

  const existing = await getAnalysisTemplate(supabase, id);
  if (!existing) {
    return NextResponse.json({ error: "Template não encontrado" }, { status: 404 });
  }
  if (existing.is_builtin) {
    return NextResponse.json({ error: "Templates built-in não podem ser excluídos" }, { status: 403 });
  }

  const admin = createAdminClient();
  await deleteAnalysisTemplate(admin, user.id, existing.id);
  return NextResponse.json({ ok: true });
}
