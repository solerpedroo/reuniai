import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  deleteSpeakerMapping,
  getSpeakerMappings,
  upsertSpeakerMapping,
} from "@/lib/speakers/mappings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UpsertSchema = z.object({
  label_pattern: z.string().trim().min(1).max(200),
  display_name: z.string().trim().min(1).max(200),
  participant_email: z.string().email().nullish(),
});

const DeleteSchema = z.object({
  label_pattern: z.string().trim().min(1).max(200),
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

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const parsed = UpsertSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const mapping = await upsertSpeakerMapping(admin, user.id, parsed.data);
  return NextResponse.json({ mapping });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const parsed = DeleteSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  await deleteSpeakerMapping(admin, user.id, parsed.data.label_pattern);
  return NextResponse.json({ ok: true });
}
