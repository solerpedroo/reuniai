import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import {
  detectTemplateFromTitle,
  parseTemplateId,
  type AnalysisTemplateId,
} from "@/lib/analysis/template-types";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function resolveAnalysisTemplate(
  admin: AdminClient,
  meeting: {
    id: string;
    user_id: string;
    title: string;
    analysis_template: string | null;
    calendar_recurring_event_id: string | null;
  }
): Promise<AnalysisTemplateId> {
  if (meeting.analysis_template) {
    return parseTemplateId(meeting.analysis_template);
  }

  const detected = detectTemplateFromTitle(meeting.title);
  if (detected) return detected;

  if (meeting.calendar_recurring_event_id) {
    const { data: seriesDefault } = await admin
      .from("series_analysis_defaults")
      .select("analysis_template")
      .eq("user_id", meeting.user_id)
      .eq("calendar_recurring_event_id", meeting.calendar_recurring_event_id)
      .maybeSingle();

    if (seriesDefault?.analysis_template) {
      return parseTemplateId(seriesDefault.analysis_template);
    }
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("default_analysis_template")
    .eq("id", meeting.user_id)
    .maybeSingle();

  return parseTemplateId(
    (profile as { default_analysis_template?: string } | null)?.default_analysis_template
  );
}
