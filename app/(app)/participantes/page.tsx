import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ParticipantDirectory } from "@/components/participants/participant-directory";
import {
  getParticipantDirectory,
  type ParticipantSort,
} from "@/lib/participants/directory";
import { createClient } from "@/lib/supabase/server";

const SORT_VALUES: ParticipantSort[] = ["recent", "meetings", "tasks"];

type ParticipantsPageProps = {
  searchParams: Promise<{ q?: string; sort?: string }>;
};

export default async function ParticipantsPage({ searchParams }: ParticipantsPageProps) {
  const params = await searchParams;
  const search = params.q?.trim() ?? "";
  const sort = SORT_VALUES.includes(params.sort as ParticipantSort)
    ? (params.sort as ParticipantSort)
    : "recent";

  const supabase = await createClient();
  const participants = await getParticipantDirectory(supabase, { search, sort });

  return (
    <div>
      <PageHeader
        title="Participantes"
        description="Pessoas com quem você se reuniu — histórico, tarefas em aberto e próximas calls."
        meta="Relacionamentos"
      />
      <Suspense fallback={null}>
        <ParticipantDirectory participants={participants} search={search} sort={sort} />
      </Suspense>
    </div>
  );
}
