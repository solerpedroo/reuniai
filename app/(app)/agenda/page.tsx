import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { DailyAgendaView } from "@/components/agenda/daily-agenda-view";
import { PwaInstallBanner } from "@/components/pwa/pwa-install-banner";
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

      <Suspense fallback={null}>
        <DailyAgendaView timeline={timeline} />
      </Suspense>
    </div>
  );
}
