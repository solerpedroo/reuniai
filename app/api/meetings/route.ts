import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdhocMeeting } from "@/lib/meetings/create-adhoc";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const CreateMeetingSchema = z.object({
  meetingUrl: z.string().trim().min(1, "Link da reunião é obrigatório"),
  title: z.string().trim().max(200).optional(),
  startBot: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (isRateLimited({ key: `bot:${user.id}`, ...RATE_LIMITS.bot })) {
    const { error, status } = rateLimitResponse("Muitas ações de bot em pouco tempo.");
    return NextResponse.json({ error }, { status });
  }

  const parsed = CreateMeetingSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const result = await createAdhocMeeting(admin, user.id, parsed.data);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    meetingId: result.meeting.id,
    reused: result.reused,
    botStarted: result.botStarted,
    botError: result.botError,
    meeting: result.meeting,
  });
}
