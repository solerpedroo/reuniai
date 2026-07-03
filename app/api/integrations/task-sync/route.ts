import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { listTaskSyncStatus, pullExternalStatuses } from "@/lib/task-sync/sync";
import type { TaskSyncProvider } from "@/lib/task-sync/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const connections = await listTaskSyncStatus(admin, user.id);
  return NextResponse.json({ connections });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { action?: string };
  const admin = createAdminClient();

  if (body.action === "pull") {
    const result = await pullExternalStatuses(admin, user.id);
    return NextResponse.json({ ok: true, ...result });
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const provider = new URL(request.url).searchParams.get("provider") as TaskSyncProvider | null;
  if (!provider || (provider !== "todoist" && provider !== "google_tasks")) {
    return NextResponse.json({ error: "Provider inválido" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("task_sync_connections")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", provider);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
