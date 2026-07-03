import { NextResponse, type NextRequest } from "next/server";
import { globalSearch } from "@/lib/search/global-search";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ query: q, mode: "text", hits: [] });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (isRateLimited({ key: `search:${user.id}`, ...RATE_LIMITS.search })) {
    const { error, status } = rateLimitResponse("Muitas buscas em pouco tempo.");
    return NextResponse.json({ error }, { status });
  }

  const result = await globalSearch(supabase, q);
  return NextResponse.json(result);
}
