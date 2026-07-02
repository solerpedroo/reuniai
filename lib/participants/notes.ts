import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";
import { decodeParticipantKey } from "@/lib/participants/normalize";

type NotesClient = Awaited<ReturnType<typeof createClient>>;
type AdminClient = ReturnType<typeof createAdminClient>;

export type ParticipantNote = {
  participant_key: string;
  body: string;
  updated_at: string;
};

export async function getParticipantNote(
  supabase: NotesClient,
  userId: string,
  participantKey: string
): Promise<ParticipantNote | null> {
  const { data } = await supabase
    .from("participant_notes")
    .select("participant_key, body, updated_at")
    .eq("user_id", userId)
    .eq("participant_key", participantKey)
    .maybeSingle<ParticipantNote>();

  return data;
}

export async function upsertParticipantNote(
  admin: AdminClient,
  userId: string,
  participantKey: string,
  body: string
): Promise<ParticipantNote> {
  const { data, error } = await admin
    .from("participant_notes")
    .upsert(
      {
        user_id: userId,
        participant_key: participantKey,
        body,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,participant_key" }
    )
    .select("participant_key, body, updated_at")
    .single<ParticipantNote>();

  if (error || !data) {
    throw new Error(error?.message ?? "Falha ao salvar nota");
  }

  return data;
}

export async function getParticipantNotesByKeys(
  supabase: NotesClient,
  userId: string,
  keys: string[]
): Promise<Map<string, ParticipantNote>> {
  if (keys.length === 0) return new Map();

  const { data } = await supabase
    .from("participant_notes")
    .select("participant_key, body, updated_at")
    .eq("user_id", userId)
    .in("participant_key", keys);

  const map = new Map<string, ParticipantNote>();
  for (const row of (data ?? []) as ParticipantNote[]) {
    map.set(row.participant_key, row);
  }
  return map;
}

export function truncateNotePreview(body: string, max = 80): string {
  const trimmed = body.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function parseParticipantKeyParam(encoded: string): string {
  return decodeParticipantKey(encoded);
}

export async function getMeetingPersonalNotes(
  supabase: NotesClient,
  meetingId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("meetings")
    .select("personal_notes")
    .eq("id", meetingId)
    .maybeSingle<{ personal_notes: string | null }>();

  return data?.personal_notes ?? null;
}

export async function updateMeetingPersonalNotes(
  admin: AdminClient,
  userId: string,
  meetingId: string,
  personalNotes: string
): Promise<string> {
  const { data, error } = await admin
    .from("meetings")
    .update({ personal_notes: personalNotes })
    .eq("id", meetingId)
    .eq("user_id", userId)
    .select("personal_notes")
    .maybeSingle<{ personal_notes: string | null }>();

  if (error || !data) {
    throw new Error(error?.message ?? "Falha ao salvar notas");
  }

  return data.personal_notes ?? "";
}
