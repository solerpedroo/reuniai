import { NextResponse } from "next/server";
import {
  buildAccountExportZip,
  canExportAccount,
  markAccountExported,
} from "@/lib/account/export-zip";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const gate = await canExportAccount(admin, user.id);

  if (!gate.allowed) {
    const hours = Math.ceil((gate.retryAfterMs ?? 0) / 3_600_000);
    return NextResponse.json(
      { error: `Export disponível novamente em ~${hours}h (limite 1×/24h).` },
      { status: 429 }
    );
  }

  try {
    const zipBuffer = await buildAccountExportZip(admin, user.id);
    await markAccountExported(admin, user.id);

    const filename = `reuniai-export-${new Date().toISOString().slice(0, 10)}.zip`;

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Falha no export LGPD:", err);
    return NextResponse.json({ error: "Falha ao gerar export" }, { status: 500 });
  }
}
