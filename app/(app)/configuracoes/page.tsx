import type { Profile } from "@/lib/supabase/types";
import { PageHeader } from "@/components/layout/page-header";
import { AccountActions } from "@/components/settings/account-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let autoJoin = true;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("auto_join_enabled")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      autoJoin = (profile as Pick<Profile, "auto_join_enabled">).auto_join_enabled;
    }
  }

  const email = user?.email ?? "—";

  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Calendário, regras de auto-join, retenção de dados e conta."
        meta="Conta"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Conta</CardTitle>
            <CardDescription>E-mail da sessão atual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm font-medium">{email}</p>
            <AccountActions />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Google Calendar</CardTitle>
            <CardDescription>Conectar calendário para sync automático</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Badge variant="secondary">Onda 5</Badge>
            <span className="text-sm text-muted-foreground">Não conectado</span>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Auto-join do bot</CardTitle>
            <CardDescription>ReuniAI entra automaticamente nas calls agendadas</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant={autoJoin ? "default" : "secondary"}>
              {autoJoin ? "Ativado" : "Desativado"}
            </Badge>
            <p className="mt-2 text-xs text-muted-foreground">
              Alteração na UI disponível na Onda 5.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
