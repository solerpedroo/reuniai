import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  deleteAllNotifications,
  deleteNotification,
  deleteReadNotifications,
  getRecentNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PatchSchema = z.union([
  z.object({ id: z.string().uuid() }),
  z.object({ markAllRead: z.literal(true) }),
]);

const DeleteSchema = z.union([
  z.object({ id: z.string().uuid() }),
  z.object({ clearRead: z.literal(true) }),
  z.object({ clearAll: z.literal(true) }),
]);

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const filter = request.nextUrl.searchParams.get("filter");
  const notifications = await getRecentNotifications(supabase, {
    unreadOnly: filter === "unread",
  });
  return NextResponse.json({ notifications });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const parsed = PatchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  if ("markAllRead" in parsed.data) {
    await markAllNotificationsRead(user.id);
    return NextResponse.json({ ok: true });
  }

  await markNotificationRead(user.id, parsed.data.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const parsed = DeleteSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  if ("clearAll" in parsed.data) {
    await deleteAllNotifications(user.id);
    return NextResponse.json({ ok: true });
  }

  if ("clearRead" in parsed.data) {
    await deleteReadNotifications(user.id);
    return NextResponse.json({ ok: true });
  }

  await deleteNotification(user.id, parsed.data.id);
  return NextResponse.json({ ok: true });
}
