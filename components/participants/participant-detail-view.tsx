import Link from "next/link";
import { ArrowLeft, CalendarBlank, CheckSquare, Microphone } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/meetings/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ParticipantNotesEditor } from "@/components/participants/participant-notes-editor";
import type { ParticipantTalkTimeSummary } from "@/lib/insights/talk-time-types";
import type { ParticipantDetail } from "@/lib/participants/directory";
import { formatMeetingDate } from "@/lib/meetings/types";

type ParticipantDetailViewProps = {
  participant: ParticipantDetail;
  initialNoteBody: string;
  talkTimeSummary: ParticipantTalkTimeSummary | null;
};

export function ParticipantDetailView({
  participant,
  initialNoteBody,
  talkTimeSummary,
}: ParticipantDetailViewProps) {
  return (
    <div>
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4">
          <Link href="/participantes">
            <ArrowLeft size={16} className="mr-1.5" aria-hidden />
            Voltar
          </Link>
        </Button>
        <PageHeader
          title={participant.displayName}
          description={
            participant.email ??
            `${participant.meetingCount} reunião${participant.meetingCount === 1 ? "" : "ões"} em comum`
          }
          meta="Participante"
        />
      </div>

      {participant.nextScheduledMeeting && (
        <Card className="surface-card mb-6 border-brand/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarBlank size={18} className="text-brand" aria-hidden />
              Próxima reunião agendada
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{participant.nextScheduledMeeting.title}</p>
              <p className="text-sm text-muted-foreground">
                {formatMeetingDate(participant.nextScheduledMeeting.started_at)}
              </p>
            </div>
            <Button size="sm" asChild>
              <Link href={`/reunioes/${participant.nextScheduledMeeting.id}`}>Ver reunião</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {talkTimeSummary && (
        <Card className="surface-card mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Microphone size={18} className="text-brand" aria-hidden />
              Participação em reuniões
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              ~{talkTimeSummary.avgPercent}% do tempo de fala em{" "}
              {talkTimeSummary.meetingCount} reunião
              {talkTimeSummary.meetingCount === 1 ? "" : "ões"} (90 dias)
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/participacao">Ver dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="mb-6">
        <Card className="surface-card">
          <CardHeader>
            <CardTitle className="text-base">Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <ParticipantNotesEditor
              participantKey={participant.hrefKey}
              initialBody={initialNoteBody}
            />
          </CardContent>
        </Card>
      </div>

      {participant.email && (
        <p className="mb-6 text-sm text-muted-foreground">
          <a href="/speakers" className="text-brand hover:underline">
            Gerenciar mapeamento de speaker
          </a>{" "}
          para melhorar transcrições com este participante.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="surface-card">
          <CardHeader>
            <CardTitle className="text-base">Reuniões em comum</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {participant.meetings.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma reunião registrada.</p>
            ) : (
              participant.meetings.map((meeting) => (
                <Link
                  key={meeting.id}
                  href={`/reunioes/${meeting.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2.5 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{meeting.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatMeetingDate(meeting.started_at)}
                    </p>
                  </div>
                  <StatusBadge status={meeting.status} />
                </Link>
              ))
            )}
            {participant.meetings[0]?.calendar_recurring_event_id && (
              <Button variant="outline" size="sm" asChild className="mt-2">
                <Link
                  href={`/series/${encodeURIComponent(participant.meetings[0].calendar_recurring_event_id!)}`}
                >
                  Ver série recorrente
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="surface-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckSquare size={18} className="text-brand" aria-hidden />
              Tarefas abertas atribuídas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {participant.openTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma tarefa em aberto atribuída.</p>
            ) : (
              participant.openTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/reunioes/${task.meeting_id}`}
                  className="block rounded-lg border border-border/70 px-3 py-2.5 transition-colors hover:bg-muted/40"
                >
                  <p className="font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {task.meeting_title}
                    {task.due_date ? ` · prazo ${task.due_date}` : ""}
                  </p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
