import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { SpeakerMapping } from "@/lib/workflow/types";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function getSpeakerMappings(
  admin: AdminClient,
  userId: string
): Promise<SpeakerMapping[]> {
  const { data, error } = await admin
    .from("speaker_mappings")
    .select("*")
    .eq("user_id", userId)
    .order("label_pattern", { ascending: true });

  if (error) throw error;
  return (data ?? []) as SpeakerMapping[];
}

function buildLabelMap(mappings: SpeakerMapping[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const mapping of mappings) {
    map.set(mapping.label_pattern.trim().toLowerCase(), mapping.display_name);
  }
  return map;
}

export async function applySpeakerMappingsToMeeting(
  admin: AdminClient,
  meetingId: string,
  userId: string
): Promise<number> {
  const mappings = await getSpeakerMappings(admin, userId);
  if (mappings.length === 0) return 0;

  const labelMap = buildLabelMap(mappings);

  const { data: participants } = await admin
    .from("participants")
    .select("email, name")
    .eq("meeting_id", meetingId);

  for (const participant of participants ?? []) {
    const row = participant as { email: string | null; name: string };
    const emailMapping = mappings.find(
      (m) => m.participant_email && row.email && m.participant_email === row.email
    );
    if (emailMapping) {
      labelMap.set(row.name.trim().toLowerCase(), emailMapping.display_name);
    }
  }

  const { data: segments, error } = await admin
    .from("transcript_segments")
    .select("id, speaker_label")
    .eq("meeting_id", meetingId);

  if (error) throw error;
  if (!segments?.length) return 0;

  let updated = 0;
  for (const segment of segments) {
    const row = segment as { id: string; speaker_label: string };
    const mapped = labelMap.get(row.speaker_label.trim().toLowerCase());
    if (!mapped || mapped === row.speaker_label) continue;

    const { error: updateError } = await admin
      .from("transcript_segments")
      .update({ speaker_label: mapped })
      .eq("id", row.id);

    if (!updateError) updated += 1;
  }

  return updated;
}

export async function upsertSpeakerMapping(
  admin: AdminClient,
  userId: string,
  input: { label_pattern: string; display_name: string; participant_email?: string | null }
): Promise<SpeakerMapping> {
  const { data, error } = await admin
    .from("speaker_mappings")
    .upsert(
      {
        user_id: userId,
        label_pattern: input.label_pattern.trim(),
        display_name: input.display_name.trim(),
        participant_email: input.participant_email ?? null,
      },
      { onConflict: "user_id,label_pattern" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return data as SpeakerMapping;
}
