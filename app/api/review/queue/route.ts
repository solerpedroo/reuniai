import { NextResponse, type NextRequest } from "next/server";
import { getReviewQueue } from "@/lib/review/review-queue";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const limit = Math.min(Number.parseInt(params.get("limit") ?? "50", 10) || 50, 100);
  const offset = Math.max(Number.parseInt(params.get("offset") ?? "0", 10) || 0, 0);

  try {
    const { items, counts } = await getReviewQueue(supabase, { limit, offset });
    return NextResponse.json({ items, counts });
  } catch {
    return NextResponse.json({ error: "Falha ao carregar fila de revisão" }, { status: 500 });
  }
}
