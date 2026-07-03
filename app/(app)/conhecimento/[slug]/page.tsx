import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ slug: string }> };

export default async function KnowledgeEntryPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: entry } = await admin
    .from("knowledge_entries")
    .select("*")
    .eq("user_id", user.id)
    .eq("slug", slug)
    .maybeSingle();

  if (!entry) notFound();

  return (
    <div>
      <PageHeader
        title={entry.title}
        description={entry.summary ?? undefined}
        meta="Conhecimento"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/conhecimento">Voltar</Link>
          </Button>
        }
      />
      <article className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
        {entry.body}
      </article>
      {entry.source_meeting_ids?.length > 0 && (
        <div className="mt-8 space-y-2">
          <h2 className="text-sm font-medium">Fontes</h2>
          <ul className="text-sm text-muted-foreground">
            {(entry.source_meeting_ids as string[]).map((id) => (
              <li key={id}>
                <Link href={`/reunioes/${id}`} className="underline">
                  Reunião {id.slice(0, 8)}…
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
