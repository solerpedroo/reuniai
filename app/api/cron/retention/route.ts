import { NextResponse, type NextRequest } from "next/server";
import { deleteMeetingById } from "@/lib/meetings/delete";
import { logStructured } from "@/lib/logging/structured";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ProfileRow = {
  id: string;
  retention_days: number;
};

type MeetingRow = {
  id: string;
  started_at: string;
};

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, retention_days");

  if (error) {
    logStructured("error", "retention.list_profiles_failed", { message: error.message });
    return NextResponse.json({ error: "Falha ao listar perfis" }, { status: 500 });
  }

  let deleted = 0;
  let failed = 0;

  for (const profile of (profiles ?? []) as ProfileRow[]) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - profile.retention_days);

    const { data: expired, error: listError } = await admin
      .from("meetings")
      .select("id, started_at")
      .eq("user_id", profile.id)
      .lt("started_at", cutoff.toISOString());

    if (listError) {
      logStructured("error", "retention.list_meetings_failed", {
        userId: profile.id,
        message: listError.message,
      });
      failed += 1;
      continue;
    }

    for (const meeting of (expired ?? []) as MeetingRow[]) {
      try {
        const result = await deleteMeetingById(admin, meeting.id);
        if (result.deleted) deleted += 1;
      } catch (err) {
        failed += 1;
        logStructured("error", "retention.delete_meeting_failed", {
          userId: profile.id,
          meetingId: meeting.id,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  logStructured("info", "retention.completed", {
    profiles: profiles?.length ?? 0,
    deleted,
    failed,
  });

  return NextResponse.json({
    ok: true,
    profiles: profiles?.length ?? 0,
    deleted,
    failed,
  });
}
