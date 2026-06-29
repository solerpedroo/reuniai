import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReunioesPage() {
  return (
    <div>
      <PageHeader
        title="Reuniões"
        description="Todas as reuniões gravadas pelo ReuniAI Bot, com status e filtros."
        meta="Biblioteca"
      />

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Nenhuma reunião ainda</CardTitle>
            <Badge variant="secondary">Placeholder</Badge>
          </div>
          <CardDescription>
            A data table com filtros por status, plataforma e data será implementada na Onda 4.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Zoom, Google Meet e Microsoft Teams serão suportados via bot nas chamadas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
