import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ReviewQueue } from "@/components/review/review-queue";
import { Button } from "@/components/ui/button";
import { isLlmConfigured } from "@/lib/llm/client";
import { getReviewQueue } from "@/lib/review/review-queue";
import { createClient } from "@/lib/supabase/server";

export default async function RevisarPage() {
  const supabase = await createClient();
  const { items, counts } = await getReviewQueue(supabase);

  return (
    <div>
      <PageHeader
        title="Fila de revisão"
        description="Feche várias calls em sequência — atribuições, follow-up e revisão sem abrir cada detalhe."
        meta="Pós-reunião"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/follow-ups">Follow-ups</Link>
          </Button>
        }
      />

      <Suspense fallback={null}>
        <ReviewQueue
          initialItems={items}
          initialCounts={counts}
          llmEnabled={isLlmConfigured()}
        />
      </Suspense>
    </div>
  );
}
