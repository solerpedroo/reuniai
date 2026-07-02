import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateAndSaveFollowUp, getFollowUpForMeeting } from "@/lib/meetings/follow-up";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TablesUpdate } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  subject: z.string().optional(),
  body: z.string().optional(),
  follow_up_done: z.boolean().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    .eq("id", id)
    .maybeSingle<{ id: string; user_id: string }>();

  if (!meeting || meeting.user_id !== user.id) {
    return NextResponse.json({ error: "Reunião não encontrada" }, { status: 404 });
  }

  const admin = createAdminClient();
  const followUp = await getFollowUpForMeeting(admin, id);

  return NextResponse.json({ followUp });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const followUp = await generateAndSaveFollowUp(admin, id);

  if (!followUp) {
    return NextResponse.json({ error: "Não foi possível gerar o follow-up" }, { status: 422 });
  }

  return NextResponse.json({ followUp });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const updates: TablesUpdate<"meeting_follow_ups"> = {};
  if (parsed.data.subject !== undefined) updates.subject = parsed.data.subject;
  if (parsed.data.body !== undefined) updates.body = parsed.data.body;
  if (parsed.data.follow_up_done === true) {
    updates.follow_up_done_at = new Date().toISOString();
  } else if (parsed.data.follow_up_done === false) {
    updates.follow_up_done_at = null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nenhuma alteração informada" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("meeting_follow_ups")
    .update(updates)
    .eq("meeting_id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ followUp: data });
}
