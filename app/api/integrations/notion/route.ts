import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { NotionConnection } from "@/lib/workflow/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data } = await supabase
    .from("notion_connections")
    .select("workspace_name")
    .eq("user_id", user.id)
    .maybeSingle<Pick<NotionConnection, "workspace_name">>();

  return NextResponse.json({
    connected: Boolean(data),
    workspace_name: data?.workspace_name ?? null,
  });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { error } = await supabase.from("notion_connections").delete().eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
