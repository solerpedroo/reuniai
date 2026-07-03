import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { Meeting } from "@/lib/supabase/types";
import { parseTemplateId } from "@/lib/analysis/template-types";

type AdminClient = ReturnType<typeof createAdminClient>;

export type CreateImportInput = {
  title: string;
  startedAt?: string;
  analysisTemplate?: string | null;
};

export async function createImportedMeeting(
  admin: AdminClient,
  userId: string,
  input: CreateImportInput
): Promise<{ ok: true; meeting: Meeting } | { ok: false; error: string }> {
  const title = input.title.trim();
  if (!title) {
    return { ok: false, error: "Título é obrigatório." };
  }

  const startedAt = input.startedAt?.trim() || new Date().toISOString();
  const parsedDate = Date.parse(startedAt);
  if (Number.isNaN(parsedDate)) {
    return { ok: false, error: "Data de início inválida." };
  }

  const template = input.analysisTemplate ? parseTemplateId(input.analysisTemplate) : null;

  const { data: meeting, error } = await admin
    .from("meetings")
    .insert({
      user_id: userId,
      title,
      platform: "other",
      started_at: new Date(parsedDate).toISOString(),
      status: "processing",
      calendar_event_id: null,
      meeting_url: null,
      analysis_template: template,
      transcript_source: "upload",
    })
    .select("*")
    .single<Meeting>();

  if (error || !meeting) {
    return { ok: false, error: "Falha ao criar reunião importada." };
  }

  return { ok: true, meeting };
}
