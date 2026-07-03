import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("meeting_tags")
    .select("tag_id, tags(*)")
    .eq("meeting_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const tags = ((data ?? []) as { tags: unknown }[]).map((row) => row.tags).filter(Boolean);
  return NextResponse.json({ tags });
}

export async function PUT(
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

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle<{ id: string; user_id: string }>();

  if (!meeting || meeting.user_id !== user.id) {
    return NextResponse.json({ error: "Reunião não encontrada" }, { status: 404 });
  }

  const body = (await request.json()) as { tagIds?: string[] };
  const tagIds = body.tagIds ?? [];

  if (tagIds.length > 0) {
    const { data: ownedTags } = await supabase
      .from("tags")
      .select("id")
      .eq("user_id", user.id)
      .in("id", tagIds);

    const ownedIds = new Set(((ownedTags ?? []) as { id: string }[]).map((tag) => tag.id));
    if (ownedIds.size !== tagIds.length) {
      return NextResponse.json({ error: "Tag inválida" }, { status: 400 });
    }
  }

  const admin = createAdminClient();
  const { error: deleteError } = await admin.from("meeting_tags").delete().eq("meeting_id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  if (tagIds.length > 0) {
    const rows = tagIds.map((tagId) => ({ meeting_id: id, tag_id: tagId }));
    const { error: insertError } = await admin.from("meeting_tags").insert(rows);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
