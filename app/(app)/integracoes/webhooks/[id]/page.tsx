import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { WebhookDetailView } from "@/components/integrations/webhook-detail-view";
import { getIntegrationLogs, getWebhookDetail } from "@/lib/integrations/hub";
import { createClient } from "@/lib/supabase/server";

export default async function WebhookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const webhook = await getWebhookDetail(supabase, id);

  if (!webhook) notFound();

  const logs = await getIntegrationLogs(supabase, { webhookId: id, limit: 50 });

  return (
    <div>
      <PageHeader
        title="Detalhe do webhook"
        description="Eventos, testes e histórico de disparos."
        meta="Integrações"
      />
      <WebhookDetailView webhook={webhook} initialLogs={logs} />
    </div>
  );
}
