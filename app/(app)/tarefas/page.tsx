import { PageHeader } from "@/components/layout/page-header";
import { TasksInbox } from "@/components/tasks/tasks-inbox";
import {
  getInboxActionItems,
  getInboxCounts,
  getInboxFilterOptions,
  parseInboxQuery,
} from "@/lib/meetings/action-items-inbox";
import { createClient } from "@/lib/supabase/server";

type TasksPageProps = {
  searchParams: Promise<{
    filtro?: string;
    reuniao?: string;
    responsavel?: string;
    tag?: string;
  }>;
};

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const params = await searchParams;
  const query = parseInboxQuery(params);
  const supabase = await createClient();

  const [items, counts, options] = await Promise.all([
    getInboxActionItems(supabase, query),
    getInboxCounts(supabase),
    getInboxFilterOptions(supabase),
  ]);

  return (
    <div>
      <PageHeader
        title="Tarefas"
        description="Action items de todas as suas reuniões — triagem rápida do que precisa de atenção."
        meta="Inbox"
      />
      <TasksInbox query={query} items={items} counts={counts} options={options} />
    </div>
  );
}
