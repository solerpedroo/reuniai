import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  getParticipantNote,
  parseParticipantKeyParam,
  upsertParticipantNote,
} from "@/lib/participants/notes";
import { normalizeEmail } from "@/lib/participants/normalize";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  body: z.string().max(20_000),
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

  const participantKeyValue = parseParticipantKeyParam(encodedKey);
  const note = await getParticipantNote(supabase, user.id, participantKeyValue);

  return NextResponse.json({ note });
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

  const participantKeyValue = parseParticipantKeyParam(encodedKey);

  if (participantKeyValue.startsWith("email:")) {
    const email = normalizeEmail(participantKeyValue.slice(6));
    if (!email) {
      return NextResponse.json({ error: "Chave de participante inválida" }, { status: 400 });
    }
  }

  const admin = createAdminClient();
  const note = await upsertParticipantNote(
    admin,
    user.id,
    participantKeyValue,
    parsed.data.body
  );

  return NextResponse.json({ note });
}
