import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  batchDeleteNotifications,
  batchMarkNotificationsRead,
  markAllNotificationsRead,
} from "@/lib/notifications/inbox";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BatchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("markRead"),
    ids: z.array(z.string().uuid()).min(1).max(100),
  }),
  z.object({
    action: z.literal("delete"),
    ids: z.array(z.string().uuid()).min(1).max(100),
  }),
  z.object({ action: z.literal("markAllRead") }),
]);

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const parsed = BatchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  if (parsed.data.action === "markAllRead") {
    await markAllNotificationsRead(user.id);
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "markRead") {
    await batchMarkNotificationsRead(user.id, parsed.data.ids);
    return NextResponse.json({ ok: true });
  }

  await batchDeleteNotifications(user.id, parsed.data.ids);
  return NextResponse.json({ ok: true });
}
