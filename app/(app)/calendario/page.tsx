import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { CalendarHygieneView } from "@/components/calendar/calendar-hygiene-view";
import { Button } from "@/components/ui/button";

export default function CalendarioPage() {
  return (
    <div>
      <PageHeader
        title="Higiene de calendário"
        description="Analise a carga de reuniões da próxima semana e receba sugestões para cortar o que não agrega."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/agenda">Agenda do dia</Link>
          </Button>
        }
      />
      <CalendarHygieneView />
    </div>
  );
}
