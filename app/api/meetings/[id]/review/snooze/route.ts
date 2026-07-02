import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { reviewSnoozeUntilFromPreset } from "@/lib/review/review-snooze";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SnoozeSchema = z
  .object({
    preset: z.enum(["tomorrow", "in_3_days"]).optional(),
    until: z.string().datetime().optional(),
    clear: z.boolean().optional(),
  })
  .refine((value) => value.clear || value.preset || value.until, "Informe preset, until ou clear");

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
    .select("id, user_id, status, meeting_reviewed_at")
    .eq("id", meetingId)
    .maybeSingle<{
      id: string;
      user_id: string;
      status: string;
      meeting_reviewed_at: string | null;
    }>();

  if (!meeting || meeting.user_id !== user.id) {
    return NextResponse.json({ error: "Reunião não encontrada" }, { status: 404 });
  }

  if (meeting.status !== "completed") {
    return NextResponse.json(
      { error: "Só é possível adiar revisão de reuniões concluídas" },
      { status: 400 }
    );
  }

  if (meeting.meeting_reviewed_at) {
    return NextResponse.json({ error: "Reunião já revisada" }, { status: 400 });
  }

  const parsed = SnoozeSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const reviewSnoozedUntil = parsed.data.clear
    ? null
    : parsed.data.until ?? reviewSnoozeUntilFromPreset(parsed.data.preset!);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("meetings")
    .update({ review_snoozed_until: reviewSnoozedUntil })
    .eq("id", meetingId)
    .eq("user_id", user.id)
    .select("review_snoozed_until")
    .maybeSingle<{ review_snoozed_until: string | null }>();

  if (error || !data) {
    return NextResponse.json({ error: "Falha ao adiar revisão" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, review_snoozed_until: data.review_snoozed_until });
}
