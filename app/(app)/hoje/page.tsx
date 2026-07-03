import { PageHeader } from "@/components/layout/page-header";
import { DailyBriefingView } from "@/components/briefing/daily-briefing-view";
import { getDailyBriefing } from "@/lib/briefing/daily-briefing";
import { createClient } from "@/lib/supabase/server";

export default async function HojePage() {
  const supabase = await createClient();
  const briefing = await getDailyBriefing(supabase);

  return (
    <div>
      <PageHeader
        title="Hoje"
        description="Briefing matinal — o que importa agora para começar o dia."
        meta="Briefing"
      />
      <DailyBriefingView briefing={briefing} />
    </div>
  );
}
