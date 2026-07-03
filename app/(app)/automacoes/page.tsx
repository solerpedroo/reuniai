import { PageHeader } from "@/components/layout/page-header";
import { PlaybooksHubView } from "@/components/playbooks/playbooks-hub-view";
import { listPlaybooks, listRecentPlaybookRuns } from "@/lib/playbooks/queries";
import { createClient } from "@/lib/supabase/server";

export default async function AutomacoesPage() {
  const supabase = await createClient();
  const [playbooks, recentRuns] = await Promise.all([
    listPlaybooks(supabase),
    listRecentPlaybookRuns(supabase),
  ]);

  return (
    <div>
      <PageHeader
        title="Automações"
        description="Playbooks pós-reunião: quando X acontece, execute Y automaticamente."
        meta={`${playbooks.filter((p) => p.enabled).length} ativo(s)`}
      />
      <PlaybooksHubView playbooks={playbooks} recentRuns={recentRuns} />
    </div>
  );
}
