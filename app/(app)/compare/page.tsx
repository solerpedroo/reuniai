import { Suspense } from "react";
import ComparePage from "./compare-page";
import { getComparePickerMeetings } from "@/lib/meetings/compare-picker";
import { createClient } from "@/lib/supabase/server";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string; series?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const meetings = await getComparePickerMeetings(supabase, {
    seriesId: params.series,
  });

  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando comparação…</p>}>
      <ComparePage
        meetings={meetings}
        seriesId={params.series}
        initialA={params.a ?? undefined}
        initialB={params.b ?? undefined}
      />
    </Suspense>
  );
}
