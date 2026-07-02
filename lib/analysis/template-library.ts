import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import {
  DEFAULT_TEMPLATE_SECTIONS,
  slugifyTemplateName,
  type AnalysisTemplateRecord,
  type TemplateSection,
} from "@/lib/analysis/template-catalog";

type Client = Awaited<ReturnType<typeof createClient>>;
type AdminClient = ReturnType<typeof createAdminClient>;

function mapRow(row: Record<string, unknown>): AnalysisTemplateRecord {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    sections: (row.sections as TemplateSection[]) ?? [],
    is_builtin: Boolean(row.is_builtin),
    user_id: (row.user_id as string | null) ?? null,
    updated_at: row.updated_at as string,
  };
}

export async function listAnalysisTemplates(
  supabase: Client
): Promise<AnalysisTemplateRecord[]> {
  const { data, error } = await supabase
    .from("analysis_templates")
    .select("*")
    .order("is_builtin", { ascending: false })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function getAnalysisTemplate(
  supabase: Client,
  idOrSlug: string
): Promise<AnalysisTemplateRecord | null> {
  const isUuid = /^[0-9a-f-]{36}$/i.test(idOrSlug);

  let query = supabase.from("analysis_templates").select("*").limit(1);
  query = isUuid ? query.eq("id", idOrSlug) : query.eq("slug", idOrSlug);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function createAnalysisTemplate(
  admin: AdminClient,
  userId: string,
  input: {
    name: string;
    description?: string | null;
    sections?: TemplateSection[];
    sourceSlug?: string | null;
  }
): Promise<AnalysisTemplateRecord> {
  let sections = input.sections ?? DEFAULT_TEMPLATE_SECTIONS;

  if (input.sourceSlug) {
    const { data: source } = await admin
      .from("analysis_templates")
      .select("sections")
      .eq("slug", input.sourceSlug)
      .maybeSingle();
    if (source?.sections) {
      sections = source.sections as TemplateSection[];
    }
  }

  const baseSlug = slugifyTemplateName(input.name) || "template";
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  const { data, error } = await admin
    .from("analysis_templates")
    .insert({
      user_id: userId,
      slug,
      name: input.name.trim(),
      description: input.description?.trim() ?? null,
      sections: sections as never,
      is_builtin: false,
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapRow(data as Record<string, unknown>);
}

export async function updateAnalysisTemplate(
  admin: AdminClient,
  userId: string,
  id: string,
  input: {
    name?: string;
    description?: string | null;
    sections?: TemplateSection[];
  }
): Promise<AnalysisTemplateRecord> {
  const updates: Database["public"]["Tables"]["analysis_templates"]["Update"] = {};
  if (input.name != null) updates.name = input.name.trim();
  if (input.description !== undefined) updates.description = input.description?.trim() ?? null;
  if (input.sections != null) updates.sections = input.sections as Database["public"]["Tables"]["analysis_templates"]["Update"]["sections"];

  const { data, error } = await admin
    .from("analysis_templates")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .eq("is_builtin", false)
    .select("*")
    .single();

  if (error) throw error;
  return mapRow(data as Record<string, unknown>);
}

export async function deleteAnalysisTemplate(
  admin: AdminClient,
  userId: string,
  id: string
): Promise<void> {
  const { error } = await admin
    .from("analysis_templates")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .eq("is_builtin", false);

  if (error) throw error;
}

export async function countSeriesUsingTemplateSlug(
  supabase: Client,
  slug: string
): Promise<number> {
  const { count, error } = await supabase
    .from("series_analysis_defaults")
    .select("*", { count: "exact", head: true })
    .eq("analysis_template", slug);

  if (error) throw error;
  return count ?? 0;
}
