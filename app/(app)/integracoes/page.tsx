import { PageHeader } from "@/components/layout/page-header";
import { IntegrationHubView } from "@/components/integrations/integration-hub-view";
import { getIntegrationLogs } from "@/lib/integrations/hub";
import { createClient } from "@/lib/supabase/server";
import { UI_FEATURE_VISIBILITY } from "@/lib/ui/feature-visibility";

export default async function IntegracoesPage() {
  const supabase = await createClient();
  const logs = await getIntegrationLogs(supabase, { limit: 30 });

  return (
    <div>
      <PageHeader
        title="Integrações"
        description={
          UI_FEATURE_VISIBILITY.slackIntegration
            ? "Slack, Notion e webhooks — status, testes e log de entregas num só lugar."
            : "Notion e webhooks — status, testes e log de entregas num só lugar."
        }
        meta="Hub"
      />
      <IntegrationHubView initialLogs={logs} />
    </div>
  );
}
