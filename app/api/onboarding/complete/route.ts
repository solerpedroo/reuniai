import { z } from "zod";
import { completeUserOnboarding } from "@/lib/profile/complete-onboarding";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z
  .object({
    auto_join_enabled: z.boolean(),
    consent_accepted: z.boolean(),
  })
  .refine((data) => data.consent_accepted === true, {
    message: "Consentimento LGPD é obrigatório",
    path: ["consent_accepted"],
  });

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const { error } = await completeUserOnboarding(user.id, parsed.data.auto_join_enabled);

  if (error) {
    return Response.json({ error: "Falha ao salvar perfil" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
