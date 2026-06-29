"use client";

import { DownloadSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export function ExportMeetingButton({ meetingId }: { meetingId: string }) {
  return (
    <Button variant="outline" size="sm" asChild>
      <a href={`/api/meetings/${meetingId}/export?format=md`} download>
        <DownloadSimple size={14} className="mr-1.5" />
        Exportar MD
      </a>
    </Button>
  );
}
