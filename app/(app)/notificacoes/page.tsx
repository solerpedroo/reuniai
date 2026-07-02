import { PageHeader } from "@/components/layout/page-header";
import { NotificationInboxView } from "@/components/notifications/notification-inbox-view";
import {
  getNotificationInbox,
  NOTIFICATION_TAB_KINDS,
  type NotificationInboxTab,
} from "@/lib/notifications/inbox";
import { createClient } from "@/lib/supabase/server";

function parseTab(value: string | undefined): NotificationInboxTab {
  if (value && value in NOTIFICATION_TAB_KINDS) return value as NotificationInboxTab;
  return "all";
}

export default async function NotificacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; filtro?: string }>;
}) {
  const params = await searchParams;
  const tab = parseTab(params.tab);
  const unreadOnly = params.filtro === "nao-lidas";
  const supabase = await createClient();
  const inbox = await getNotificationInbox(supabase, { tab, unreadOnly });

  return (
    <div>
      <PageHeader
        title="Notificações"
        description="Histórico completo de alertas — prep, reuniões, tarefas e sistema."
        meta="Inbox"
      />
      <NotificationInboxView
        initial={inbox}
        initialTab={tab}
        unreadOnly={unreadOnly}
      />
    </div>
  );
}
