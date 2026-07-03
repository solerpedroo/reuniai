import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { parseParticipantKeyParam } from "@/lib/participants/notes";
import {
  getParticipantRelationship,
  upsertParticipantRelationship,
} from "@/lib/participants/relationship";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  relationship_type: z.string().trim().min(1).max(50).optional(),
  talking_points: z.array(z.string().trim().max(500)).max(20).optional(),
  open_loops: z.array(z.string().trim().max(500)).max(20).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key: encodedKey } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const participantKey = parseParticipantKeyParam(encodedKey);
  const relationship = await getParticipantRelationship(supabase, user.id, participantKey);

  return NextResponse.json({ relationship });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key: encodedKey } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const parsed = PatchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const participantKey = parseParticipantKeyParam(encodedKey);
  const admin = createAdminClient();
  const relationship = await upsertParticipantRelationship(
    admin,
    user.id,
    participantKey,
    parsed.data
  );

  return NextResponse.json({ relationship });
}
