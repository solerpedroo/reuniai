import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  folder_id: z.string().uuid().nullable(),
});

export async function PUT(
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

  if (parsed.data.folder_id) {
    const { data: folder } = await supabase
      .from("folders")
      .select("id")
      .eq("id", parsed.data.folder_id)
      .maybeSingle();

    if (!folder) {
      return NextResponse.json({ error: "Pasta não encontrada" }, { status: 404 });
    }
  }

  try {
    const admin = createAdminClient();

    if (parsed.data.folder_id === null) {
      const { error } = await admin.from("meeting_folders").delete().eq("meeting_id", meetingId);
      if (error) throw error;
    } else {
      const { error: deleteError } = await admin
        .from("meeting_folders")
        .delete()
        .eq("meeting_id", meetingId);
      if (deleteError) throw deleteError;

      const { error: insertError } = await admin.from("meeting_folders").insert({
        meeting_id: meetingId,
        folder_id: parsed.data.folder_id,
      });
      if (insertError) throw insertError;
    }
  } catch (err) {
    console.error("Falha ao mover reunião para pasta:", err);
    return NextResponse.json({ error: "Falha ao atualizar pasta" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, folder_id: parsed.data.folder_id });
}
