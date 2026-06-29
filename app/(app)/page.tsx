import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const KPI_PLACEHOLDERS = [
  { label: "Reuniões este mês", value: "—", detail: "Disponível após conectar o calendário" },
  { label: "Horas gravadas", value: "—", detail: "Total processado" },
  { label: "Action items abertos", value: "—", detail: "Pendentes de conclusão" },
  { label: "Próxima reunião", value: "—", detail: "Aguardando sync" },
];

export default function HomePage() {
  return (
    <div>
      <PageHeader
        title="Visão geral"
        description="Resumo das suas reuniões, indicadores e itens que precisam de atenção."
        meta="Dashboard"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_PLACEHOLDERS.map((kpi) => (
          <Card key={kpi.label} className="shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription>{kpi.label}</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{kpi.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{kpi.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Reuniões recentes</CardTitle>
            <Badge variant="secondary">Onda 4</Badge>
          </div>
          <CardDescription>
            A lista de reuniões será exibida aqui após a integração com calendário e bot.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Conecte seu Google Calendar nas configurações para começar a mapear reuniões
            automaticamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
