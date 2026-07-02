import { NextResponse, type NextRequest } from "next/server";
import { getIntegrationLogs } from "@/lib/integrations/hub";
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

  const webhookId = request.nextUrl.searchParams.get("webhookId") ?? undefined;
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "50");

  const logs = await getIntegrationLogs(supabase, {
    webhookId,
    limit: Number.isFinite(limit) ? Math.min(limit, 100) : 50,
  });

  return NextResponse.json({ logs });
}
