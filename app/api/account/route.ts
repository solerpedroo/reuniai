import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { deleteUserAccount } from "@/lib/account/delete";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DeleteSchema = z.object({
  confirmation: z.literal("DELETAR"),
});

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
    return NextResponse.json(
      { error: 'Digite "DELETAR" para confirmar a exclusão da conta.' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const result = await deleteUserAccount(admin, user.id);

  await supabase.auth.signOut();

  return NextResponse.json({ ok: true, meetingsDeleted: result.meetingsDeleted });
}
