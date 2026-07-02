import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import { PlatformBadge } from "@/components/meetings/platform-badge";
import { ReviewBadge } from "@/components/meetings/review-badge";
import { StatusBadge } from "@/components/meetings/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Meeting } from "@/lib/supabase/types";
import { needsPostCallReview } from "@/lib/meetings/post-call-review";
import { formatDuration, formatMeetingDate, getMeetingDurationMs } from "@/lib/meetings/types";

export function RecentMeetingsTable({ meetings }: { meetings: Meeting[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Reuniões recentes</CardTitle>
          <Link
            href="/reunioes"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand transition-colors hover:text-brand/80"
          >
            Ver todas
            <CaretRight size={14} />
          </Link>
        </div>
        <CardDescription>Suas últimas reuniões processadas pelo ReuniAI.</CardDescription>
      </CardHeader>
      <CardContent>
        {meetings.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma reunião ainda. Conecte seu calendário para começar.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Título</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="hidden sm:table-cell">Plataforma</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Duração</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meetings.map((meeting) => (
                <TableRow key={meeting.id} className="group cursor-pointer transition-colors hover:bg-brand/5">
                  <TableCell className="font-medium">
                    <Link
                      href={`/reunioes/${meeting.id}`}
                      className="flex min-w-0 items-center gap-2 transition-colors group-hover:text-brand"
                    >
                      <span className="truncate">{meeting.title}</span>
                      {needsPostCallReview(meeting) && <ReviewBadge />}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatMeetingDate(meeting.started_at)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <PlatformBadge platform={meeting.platform} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={meeting.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums text-muted-foreground">
                    {formatDuration(getMeetingDurationMs(meeting))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
