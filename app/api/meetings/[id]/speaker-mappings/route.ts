import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  applySpeakerMappingsToMeeting,
  getSpeakerMappings,
  upsertSpeakerMapping,
} from "@/lib/speakers/mappings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SaveSchema = z.object({
  mappings: z.array(
    z.object({
      label_pattern: z.string().trim().min(1).max(200),
      display_name: z.string().trim().min(1).max(200),
      participant_email: z.string().email().nullish(),
    })
  ),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const mappings = await getSpeakerMappings(admin, user.id);
  return NextResponse.json({ mappings });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: meetingId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, user_id")
    .eq("id", meetingId)
    .maybeSingle<{ id: string; user_id: string }>();

  if (!meeting || meeting.user_id !== user.id) {
    return NextResponse.json({ error: "Reunião não encontrada" }, { status: 404 });
  }

  const parsed = SaveSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  for (const mapping of parsed.data.mappings) {
    await upsertSpeakerMapping(admin, user.id, mapping);
  }

  const updated = await applySpeakerMappingsToMeeting(admin, meetingId, user.id);

  return NextResponse.json({ ok: true, segmentsUpdated: updated });
}
