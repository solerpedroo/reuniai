import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { sendMeetingFollowUpEmail } from "@/lib/meetings/follow-up-send";
import { ResendDeliveryError } from "@/lib/email/resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SendSchema = z.object({
  to: z.array(z.string().email()).min(1).max(20),
  subject: z.string().trim().min(1).max(500),
  body: z.string().trim().min(1).max(20_000),
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

  const parsed = SendSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  try {
    const admin = createAdminClient();
    const followUp = await sendMeetingFollowUpEmail(admin, user.id, meetingId, parsed.data);
    return NextResponse.json({ followUp });
  } catch (err) {
    if (err instanceof ResendDeliveryError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[follow-up/send]", err);
    return NextResponse.json({ error: "Falha ao enviar follow-up" }, { status: 500 });
  }
}
