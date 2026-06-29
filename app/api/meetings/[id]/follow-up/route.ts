import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAndSaveFollowUp, getFollowUpForMeeting } from "@/lib/meetings/follow-up";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TablesUpdate } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const payload = (await request.json()) as { subject?: string; body?: string };
  const updates: TablesUpdate<"meeting_follow_ups"> = {};
  if (payload.subject !== undefined) updates.subject = payload.subject;
  if (payload.body !== undefined) updates.body = payload.body;

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
