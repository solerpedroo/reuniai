import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ConfiguracoesPage() {
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
            <Badge variant="secondary">Onda 3</Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
