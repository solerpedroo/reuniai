import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { MinutesHubView } from "@/components/minutes/minutes-hub-view";
import { Button } from "@/components/ui/button";
import { getMinutesHub } from "@/lib/minutes/generate-minutes";
import { createClient } from "@/lib/supabase/server";

export default async function AtasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const hub = user ? await getMinutesHub(supabase, user.id) : { items: [], count: 0 };

  return (
    <div>
      <PageHeader
        title="Atas"
        description="Documentos formais gerados a partir das reuniões — presentes, deliberações e encaminhamentos."
        meta={`${hub.count} ata${hub.count === 1 ? "" : "s"}`}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/reunioes">Ver reuniões</Link>
          </Button>
        }
      />
      <MinutesHubView items={hub.items} />
    </div>
  );
}
