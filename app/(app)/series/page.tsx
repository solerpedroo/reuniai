import Link from "next/link";
import { ArrowsClockwise, ArrowRight, GitDiff } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { formatMeetingDate } from "@/lib/meetings/types";
import { getMeetingsInSeries, getMeetingSeriesList } from "@/lib/series/queries";
import { createClient } from "@/lib/supabase/server";

export default async function SeriesHubPage() {
  const supabase = await createClient();
  const series = await getMeetingSeriesList(supabase);

  const compareLinks = await Promise.all(
    series.slice(0, 8).map(async (item) => {
      const meetings = await getMeetingsInSeries(supabase, item.recurringEventId);
      if (meetings.length < 2) return null;
      return {
        recurringEventId: item.recurringEventId,
        compareHref: `/compare?a=${meetings[0]!.id}&b=${meetings[1]!.id}`,
      };
    })
  );

  const compareBySeries = new Map(
    compareLinks.filter(Boolean).map((row) => [row!.recurringEventId, row!.compareHref])
  );

  return (
    <div>
      <PageHeader
        title="Séries recorrentes"
        description="Standups, syncs semanais e reuniões recorrentes — acompanhe evolução e compare ocorrências."
        meta="Organização"
      />

      {series.length === 0 ? (
        <div className="surface-card flex flex-col items-center gap-3 p-12 text-center">
          <ArrowsClockwise size={32} className="text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            Séries aparecem quando você tem 2+ reuniões com o mesmo evento recorrente do calendário.
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/reunioes">Ver reuniões</Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[320px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Série</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Ocorrências</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Última</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {series.map((item) => {
                const compareHref = compareBySeries.get(item.recurringEventId);
                return (
                  <tr
                    key={item.recurringEventId}
                    className="border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/series/${encodeURIComponent(item.recurringEventId)}`}
                        className="block font-medium hover:text-brand"
                      >
                        {item.title}
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell tabular-nums">
                      {item.meetingCount}
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                      {formatMeetingDate(item.lastStartedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {compareHref && (
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={compareHref}>
                              <GitDiff size={14} className="mr-1" />
                              Comparar
                            </Link>
                          </Button>
                        )}
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/series/${encodeURIComponent(item.recurringEventId)}`}>
                            Abrir
                            <ArrowRight size={14} className="ml-1" />
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
