import { NextResponse, type NextRequest } from "next/server";
import type { ActionItem, Meeting, MeetingSummary } from "@/lib/supabase/types";
import { compareMeetings } from "@/lib/series/compare";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const a = request.nextUrl.searchParams.get("a");
  const b = request.nextUrl.searchParams.get("b");

  if (!a || !b) {
    return NextResponse.json({ error: "Parâmetros a e b são obrigatórios" }, { status: 400 });
  }

  const { data: meetings } = await supabase
    .from("meetings")
    .select("id, user_id, title, started_at, calendar_recurring_event_id")
    .in("id", [a, b])
    .eq("user_id", user.id);

  const rows = (meetings ?? []) as Pick<
    Meeting,
    "id" | "title" | "started_at" | "calendar_recurring_event_id"
  >[];

  if (rows.length !== 2) {
    return NextResponse.json({ error: "Reuniões não encontradas" }, { status: 404 });
  }

  const meetingA = rows.find((m) => m.id === a)!;
  const meetingB = rows.find((m) => m.id === b)!;

  if (
    meetingA.calendar_recurring_event_id &&
    meetingB.calendar_recurring_event_id &&
    meetingA.calendar_recurring_event_id !== meetingB.calendar_recurring_event_id
  ) {
    return NextResponse.json(
      { error: "As reuniões devem pertencer à mesma série recorrente." },
      { status: 400 }
    );
  }

  const [summariesRes, itemsARes, itemsBRes] = await Promise.all([
    supabase.from("meeting_summaries").select("*").in("meeting_id", [a, b]),
    supabase.from("action_items").select("title, status").eq("meeting_id", a),
    supabase.from("action_items").select("title, status").eq("meeting_id", b),
  ]);

  const summaries = (summariesRes.data ?? []) as MeetingSummary[];
  const summaryA = summaries.find((s) => s.meeting_id === a) ?? null;
  const summaryB = summaries.find((s) => s.meeting_id === b) ?? null;

  const result = await compareMeetings({
    meetingA: {
      id: meetingA.id,
      title: meetingA.title,
      startedAt: meetingA.started_at,
      summary: summaryA,
    },
    meetingB: {
      id: meetingB.id,
      title: meetingB.title,
      startedAt: meetingB.started_at,
      summary: summaryB,
    },
    actionItemsA: (itemsARes.data ?? []) as Pick<ActionItem, "title" | "status">[],
    actionItemsB: (itemsBRes.data ?? []) as Pick<ActionItem, "title" | "status">[],
  });

  return NextResponse.json({
    meetingA,
    meetingB,
    ...result,
  });
}
