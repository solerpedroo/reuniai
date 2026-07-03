import { NextResponse } from "next/server";
import { buildImpactPdf } from "@/lib/impact/impact-pdf";
import { getPersonalImpact, parseImpactPeriod } from "@/lib/impact/personal-impact";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = parseImpactPeriod(searchParams.get("period") ?? undefined);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const report = await getPersonalImpact(supabase, period);
    const pdf = await buildImpactPdf(report);

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="reuniai-impacto-${period}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Falha ao gerar PDF de impacto:", err);
    return NextResponse.json({ error: "Falha ao gerar PDF" }, { status: 500 });
  }
}
