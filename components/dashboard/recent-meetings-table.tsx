import Link from "next/link";
import { CalendarBlank, CaretRight, VideoCamera } from "@phosphor-icons/react/dist/ssr";
import { JoinMeetingDialog } from "@/components/meetings/join-meeting-dialog";
import { PlatformBadge } from "@/components/meetings/platform-badge";
import { StatusBadge } from "@/components/meetings/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Meeting } from "@/lib/supabase/types";
import { formatDuration, formatMeetingDate, getMeetingDurationMs } from "@/lib/meetings/types";

export function RecentMeetingsTable({ meetings }: { meetings: Meeting[] }) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border/70 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold">Reuniões recentes</h2>
          <p className="text-xs text-muted-foreground">
            Suas últimas reuniões processadas pelo ReuniAI.
          </p>
        </div>
        <Link
          href="/reunioes"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand transition-colors hover:text-brand/80"
        >
          Ver todas
          <CaretRight size={14} />
        </Link>
      </div>

      <div className="p-2">
        {meetings.length === 0 ? (
          <EmptyState
            icon={VideoCamera}
            title="Nenhuma reunião ainda"
            description="Conecte seu calendário ou entre com um link para começar."
            tone="brand"
            className="border-0 bg-transparent py-10"
          >
            <div className="flex flex-wrap justify-center gap-2">
              <JoinMeetingDialog triggerClassName="h-9" />
              <Link
                href="/configuracoes"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted/50"
              >
                <CalendarBlank size={14} />
                Conectar calendário
              </Link>
            </div>
          </EmptyState>
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
                <TableRow
                  key={meeting.id}
                  className="group cursor-pointer transition-colors hover:bg-brand/5"
                >
                  <TableCell className="font-medium">
                    <Link
                      href={`/reunioes/${meeting.id}`}
                      className="block truncate transition-colors group-hover:text-brand"
                    >
                      {meeting.title}
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
      </div>
    </div>
  );
}
