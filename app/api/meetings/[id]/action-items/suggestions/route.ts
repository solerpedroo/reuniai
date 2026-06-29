import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  action: z.enum(["accept", "reject"]),
  ids: z.array(z.string().uuid()).min(1),
});

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

  const parsed = BodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: items, error: fetchError } = await admin
    .from("action_items")
    .select("id, status")
    .eq("meeting_id", meetingId)
    .eq("user_id", user.id)
    .in("id", parsed.data.ids);

  if (fetchError) {
    return NextResponse.json({ error: "Falha ao buscar sugestões" }, { status: 500 });
  }

  const suggestedIds = (items ?? [])
    .filter((item) => (item as { status: string }).status === "suggested")
    .map((item) => (item as { id: string }).id);

  if (suggestedIds.length === 0) {
    return NextResponse.json({ error: "Nenhuma sugestão válida" }, { status: 400 });
  }

  if (parsed.data.action === "accept") {
    const { data, error } = await admin
      .from("action_items")
      .update({ status: "open" })
      .in("id", suggestedIds)
      .select("*");

    if (error) {
      return NextResponse.json({ error: "Falha ao aceitar sugestões" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, items: data });
  }

  const { error } = await admin.from("action_items").delete().in("id", suggestedIds);
  if (error) {
    return NextResponse.json({ error: "Falha ao rejeitar sugestões" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, removedIds: suggestedIds });
}
