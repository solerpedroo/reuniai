import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { ParticipantRelationship } from "@/lib/participants/relationship-types";

type Client = Awaited<ReturnType<typeof createClient>>;
type AdminClient = ReturnType<typeof createAdminClient>;

export type { ParticipantRelationship } from "@/lib/participants/relationship-types";
export { RELATIONSHIP_TYPES } from "@/lib/participants/relationship-types";

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

export async function getParticipantRelationship(
  supabase: Client,
  userId: string,
  participantKey: string
): Promise<ParticipantRelationship | null> {
  const { data } = await supabase
    .from("participant_relationships")
    .select("participant_key, relationship_type, talking_points, open_loops, updated_at")
    .eq("user_id", userId)
    .eq("participant_key", participantKey)
    .maybeSingle<{
      participant_key: string;
      relationship_type: string;
      talking_points: unknown;
      open_loops: unknown;
      updated_at: string;
    }>();

  if (!data) return null;

  return {
    participant_key: data.participant_key,
    relationship_type: data.relationship_type,
    talking_points: parseStringArray(data.talking_points),
    open_loops: parseStringArray(data.open_loops),
    updated_at: data.updated_at,
  };
}

export async function upsertParticipantRelationship(
  admin: AdminClient,
  userId: string,
  participantKey: string,
  patch: {
    relationship_type?: string;
    talking_points?: string[];
    open_loops?: string[];
  }
): Promise<ParticipantRelationship> {
  const { data: existing } = await admin
    .from("participant_relationships")
    .select("relationship_type, talking_points, open_loops")
    .eq("user_id", userId)
    .eq("participant_key", participantKey)
    .maybeSingle();

  const payload: Database["public"]["Tables"]["participant_relationships"]["Insert"] = {
    user_id: userId,
    participant_key: participantKey,
    relationship_type: patch.relationship_type ?? existing?.relationship_type ?? "colega",
    talking_points: patch.talking_points ?? parseStringArray(existing?.talking_points) ?? [],
    open_loops: patch.open_loops ?? parseStringArray(existing?.open_loops) ?? [],
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin
    .from("participant_relationships")
    .upsert(payload, { onConflict: "user_id,participant_key" })
    .select("participant_key, relationship_type, talking_points, open_loops, updated_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Falha ao salvar relacionamento");
  }

  return {
    participant_key: data.participant_key,
    relationship_type: data.relationship_type,
    talking_points: parseStringArray(data.talking_points),
    open_loops: parseStringArray(data.open_loops),
    updated_at: data.updated_at,
  };
}
