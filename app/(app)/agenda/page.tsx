import { Suspense } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { DailyAgendaView } from "@/components/agenda/daily-agenda-view";
import { PwaInstallBanner } from "@/components/pwa/pwa-install-banner";
import { Button } from "@/components/ui/button";
import { getDailyTimeline } from "@/lib/agenda/daily-timeline";
import { createClient } from "@/lib/supabase/server";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const timeline = await getDailyTimeline(supabase, { dateIso: params.data });

  return (
    <div>
      <PageHeader
        title="Agenda do dia"
        description="Reuniões, prep, revisões pendentes e tarefas — tudo em ordem cronológica."
        meta="Seu dia"
      />

      <PwaInstallBanner />

      <div className="mb-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/prep">Hub de prep — próximos 7 dias</Link>
        </Button>
      </div>

      <Suspense fallback={null}>
        <DailyAgendaView timeline={timeline} />
      </Suspense>
    </div>
  );
}
