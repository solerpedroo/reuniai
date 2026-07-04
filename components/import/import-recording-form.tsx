"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UploadSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ANALYSIS_TEMPLATE_IDS,
  TEMPLATE_LABELS,
} from "@/lib/analysis/template-types";

export function ImportRecordingForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [template, setTemplate] = useState<string>("generic");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      toast.error("Selecione um arquivo de áudio ou vídeo.");
      return;
    }
    if (!title.trim()) {
      toast.error("Informe um título.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title.trim());
      if (startedAt) formData.append("startedAt", new Date(startedAt).toISOString());
      if (template) formData.append("analysisTemplate", template);

      const res = await fetch("/api/meetings/import", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as { error?: string; meetingId?: string };

      if (!res.ok) {
        toast.error(data.error ?? "Falha ao importar gravação.");
        if (data.meetingId) router.push(`/reunioes/${data.meetingId}`);
        return;
      }

      toast.success("Gravação importada e analisada.");
      router.push(`/reunioes/${data.meetingId}`);
      router.refresh();
    } catch {
      toast.error("Erro de rede ao importar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="import-title">Título</Label>
        <Input
          id="import-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: Call com cliente · 03/07"
          maxLength={200}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="import-date">Data e hora (opcional)</Label>
        <DateTimePicker
          id="import-date"
          value={startedAt}
          onChange={setStartedAt}
          clearable
        />
      </div>

      <div className="space-y-2">
        <Label>Template de análise</Label>
        <Select value={template} onValueChange={setTemplate}>
          <SelectTrigger>
            <SelectValue placeholder="Genérico" />
          </SelectTrigger>
          <SelectContent>
            {ANALYSIS_TEMPLATE_IDS.map((id) => (
              <SelectItem key={id} value={id}>
                {TEMPLATE_LABELS[id]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="import-file">Arquivo (até 25 MB)</Label>
        <Input
          id="import-file"
          type="file"
          accept="audio/*,video/*,.mp3,.mp4,.m4a,.wav,.webm,.ogg"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          required
        />
        <p className="text-xs text-muted-foreground">
          mp3, mp4, m4a, wav ou webm.
        </p>
      </div>

      <Button type="submit" disabled={loading} className="gap-2">
        <UploadSimple className="size-4" weight="bold" />
        {loading ? "Transcrevendo e analisando…" : "Importar gravação"}
      </Button>
    </form>
  );
}
