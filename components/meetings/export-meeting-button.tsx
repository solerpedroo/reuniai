"use client";

import { useState } from "react";
import { DownloadSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type ExportFormat = "md" | "json" | "pdf";

export function ExportMeetingButton({ meetingId }: { meetingId: string }) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("md");
  const [redact, setRedact] = useState(true);

  const exportUrl = `/api/meetings/${meetingId}/export?format=${format}&redact=${redact ? "1" : "0"}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <DownloadSimple size={14} className="mr-1.5" />
          Exportar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exportar reunião</DialogTitle>
          <DialogDescription>
            Baixe resumo, atribuições e transcrição. Redação de PII recomendada para compartilhar
            externamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Formato</p>
            <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="md">Markdown (.md)</SelectItem>
                <SelectItem value="json">JSON estruturado</SelectItem>
                <SelectItem value="pdf">PDF formatado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Redigir dados sensíveis</p>
              <p className="text-xs text-muted-foreground">
                Emails, CPF, telefones e similares viram [REDACTED]
              </p>
            </div>
            <Switch checked={redact} onCheckedChange={setRedact} />
          </div>

          <Button className="w-full" asChild onClick={() => setOpen(false)}>
            <a href={exportUrl} download>
              Baixar {format.toUpperCase()}
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
