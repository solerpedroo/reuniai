"use client";

import { useRouter } from "next/navigation";
import { ArrowsLeftRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ComparePickerMeeting } from "@/lib/meetings/compare-picker-types";
import { formatMeetingDateTime } from "@/lib/meetings/types";

export function ComparePicker({
  meetings,
  meetingAId,
  meetingBId,
  seriesId,
}: {
  meetings: ComparePickerMeeting[];
  meetingAId?: string;
  meetingBId?: string;
  seriesId?: string;
}) {
  const router = useRouter();

  function compare(a: string, b: string) {
    if (!a || !b || a === b) return;
    const params = new URLSearchParams({ a, b });
    if (seriesId) params.set("series", seriesId);
    router.push(`/compare?${params.toString()}`);
  }

  const lastTwo =
    meetings.length >= 2 ? ([meetings[0]!, meetings[1]!] as const) : null;

  return (
    <div className="surface-card space-y-4 p-5">
      <div className="flex items-center gap-2 text-sm font-medium">
        <ArrowsLeftRight size={18} className="text-brand" aria-hidden />
        Escolha duas reuniões para comparar
      </div>

      {meetings.length < 2 ? (
        <p className="text-sm text-muted-foreground">
          É preciso ter pelo menos duas reuniões concluídas
          {seriesId ? " nesta série" : ""}.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Reunião A (mais recente)</Label>
              <Select
                value={meetingAId ?? ""}
                onValueChange={(value) => compare(value, meetingBId ?? meetings[1]!.id)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar…" />
                </SelectTrigger>
                <SelectContent>
                  {meetings.map((meeting) => (
                    <SelectItem key={meeting.id} value={meeting.id}>
                      {meeting.title} · {formatMeetingDateTime(meeting.startedAt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reunião B (anterior)</Label>
              <Select
                value={meetingBId ?? ""}
                onValueChange={(value) => compare(meetingAId ?? meetings[0]!.id, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar…" />
                </SelectTrigger>
                <SelectContent>
                  {meetings.map((meeting) => (
                    <SelectItem key={meeting.id} value={meeting.id}>
                      {meeting.title} · {formatMeetingDateTime(meeting.startedAt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {lastTwo && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => compare(lastTwo[0].id, lastTwo[1].id)}
            >
              Comparar últimas duas ocorrências
            </Button>
          )}
        </>
      )}
    </div>
  );
}
