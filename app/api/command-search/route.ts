import { NextResponse, type NextRequest } from "next/server";
import { searchCommandPalette } from "@/lib/command/search";
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

  const q = request.nextUrl.searchParams.get("q") ?? "";
  const results = await searchCommandPalette(supabase, q);

  return NextResponse.json({ results });
}
