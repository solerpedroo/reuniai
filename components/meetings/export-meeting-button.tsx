"use client";

import { useState } from "react";
import { DownloadSimple, NotionLogo, Spinner } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type ExportFormat = "md" | "json" | "pdf";

function parseFilename(contentDisposition: string | null, fallback: string): string {
  if (!contentDisposition) return fallback;

  const utfMatch = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1]);
    } catch {
      return utfMatch[1];
    }
  }

  const plainMatch = /filename="([^"]+)"/i.exec(contentDisposition);
  if (plainMatch?.[1]) return plainMatch[1];

  return fallback;
}

export function ExportMeetingButton({ meetingId }: { meetingId: string }) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("md");
  const [redact, setRedact] = useState(true);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [notionLoading, setNotionLoading] = useState(false);

  const exportUrl = `/api/meetings/${meetingId}/export?format=${format}&redact=${redact ? "1" : "0"}`;

  async function downloadExport() {
    setDownloadLoading(true);
    try {
      const res = await fetch(exportUrl, { credentials: "same-origin" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Falha ao exportar");
      }

      const blob = await res.blob();
      const fallback = `reuniao.${format}`;
      const filename = parseFilename(res.headers.get("Content-Disposition"), fallback);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(objectUrl);

      toast.success(
        format === "pdf" ? "PDF baixado com sucesso" : `Arquivo ${format.toUpperCase()} baixado`
      );
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao exportar");
    } finally {
      setDownloadLoading(false);
    }
  }

  async function exportToNotion() {
    setNotionLoading(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/export/notion`, { method: "POST" });
      const data = (await res.json()) as { error?: string; url?: string };
      if (!res.ok) throw new Error(data.error ?? "Falha ao exportar");
      toast.success("Página criada no Notion");
      if (data.url) window.open(data.url, "_blank", "noopener,noreferrer");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao exportar");
    } finally {
      setNotionLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <DownloadSimple size={14} className="mr-1.5" />
          Exportar
        </Button>
      </DialogTrigger>
      <DialogContent className="overflow-hidden border-brand/15 sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Exportar reunião</DialogTitle>
          <DialogDescription>
            Baixe resumo, atribuições e transcrição. O PDF segue a identidade visual do ReuniAI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="export-format">Formato</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <SelectTrigger id="export-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="md">Markdown (.md)</SelectItem>
                <SelectItem value="json">JSON estruturado</SelectItem>
                <SelectItem value="pdf">PDF formatado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-border/70 bg-muted/20 px-3 py-3 transition-colors hover:bg-muted/35">
            <span className="space-y-0.5">
              <span className="block text-sm font-medium">Esconder dados pessoais</span>
              <span className="block text-xs text-muted-foreground">
                E-mails, telefones e documentos sensíveis são redigidos no arquivo.
              </span>
            </span>
            <Switch checked={redact} onCheckedChange={setRedact} />
          </label>
        </div>

        <DialogFooter className="gap-2 sm:flex-col">
          <Button
            className="w-full"
            variant="brand"
            disabled={downloadLoading}
            onClick={() => void downloadExport()}
          >
            {downloadLoading ? (
              <>
                <Spinner size={16} className="animate-spin" />
                Gerando arquivo…
              </>
            ) : (
              <>
                <DownloadSimple size={16} className="mr-1.5" />
                Baixar {format.toUpperCase()}
              </>
            )}
          </Button>

          <Button
            className="w-full"
            variant="outline"
            disabled={notionLoading}
            onClick={() => void exportToNotion()}
          >
            <NotionLogo size={14} className="mr-1.5" />
            {notionLoading ? "Exportando…" : "Exportar para Notion"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
