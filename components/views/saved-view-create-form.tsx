"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FOLDER_NONE } from "@/lib/folders/constants";
import type { SavedView } from "@/lib/meetings/filter-queries";
import {
  MAX_SAVED_VIEWS,
  savedViewHref,
} from "@/lib/meetings/saved-views-types";
import {
  MEETING_PLATFORMS,
  MEETING_STATUSES,
  PLATFORM_LABELS,
  STATUS_LABELS,
} from "@/lib/meetings/types";
import type { Tag } from "@/lib/workflow/types";
import type { MeetingPlatform, MeetingStatus } from "@/lib/supabase/types";

type FolderOption = { id: string; name: string };

export function SavedViewCreateForm({
  savedViews,
  tags,
  folders,
  duplicateFrom,
}: {
  savedViews: SavedView[];
  tags: Tag[];
  folders: FolderOption[];
  duplicateFrom?: SavedView;
}) {
  const router = useRouter();
  const [name, setName] = useState(duplicateFrom ? `${duplicateFrom.name} (cópia)` : "");
  const [status, setStatus] = useState<MeetingStatus | "all">(
    duplicateFrom?.filters.status ?? "all"
  );
  const [platform, setPlatform] = useState<MeetingPlatform | "all">(
    duplicateFrom?.filters.platform ?? "all"
  );
  const [tagId, setTagId] = useState(duplicateFrom?.filters.tagId ?? "all");
  const [folderId, setFolderId] = useState(duplicateFrom?.filters.folderId ?? "all");
  const [participant, setParticipant] = useState(duplicateFrom?.filters.participant ?? "");
  const [openActionsOnly, setOpenActionsOnly] = useState(
    Boolean(duplicateFrom?.filters.openActionsOnly)
  );
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Informe um nome");
      return;
    }
    if (savedViews.length >= MAX_SAVED_VIEWS) {
      toast.error(`Máximo de ${MAX_SAVED_VIEWS} vistas`);
      return;
    }

    const view: SavedView = {
      id: crypto.randomUUID(),
      name: name.trim(),
      filters: {
        status: status === "all" ? undefined : status,
        platform: platform === "all" ? undefined : platform,
        tagId: tagId === "all" ? undefined : tagId,
        folderId: folderId === "all" ? undefined : folderId,
        participant: participant.trim() || undefined,
        openActionsOnly: openActionsOnly || undefined,
      },
    };

    setBusy(true);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saved_views: [...savedViews, view] }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Falha ao criar vista");
      }
      toast.success("Vista criada");
      router.push(savedViewHref(view));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="surface-card max-w-xl space-y-4 p-6">
      <div className="space-y-2">
        <Label htmlFor="view-name">Nome</Label>
        <Input
          id="view-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex.: Reuniões concluídas da equipe"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as MeetingStatus | "all")}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Qualquer status</SelectItem>
              {MEETING_STATUSES.map((item) => (
                <SelectItem key={item} value={item}>
                  {STATUS_LABELS[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Plataforma</Label>
          <Select
            value={platform}
            onValueChange={(value) => setPlatform(value as MeetingPlatform | "all")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Plataforma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Qualquer plataforma</SelectItem>
              {MEETING_PLATFORMS.map((item) => (
                <SelectItem key={item} value={item}>
                  {PLATFORM_LABELS[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Tag</Label>
          <Select value={tagId} onValueChange={setTagId}>
            <SelectTrigger>
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Qualquer tag</SelectItem>
              {tags.map((tag) => (
                <SelectItem key={tag.id} value={tag.id}>
                  {tag.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Pasta</Label>
          <Select value={folderId} onValueChange={setFolderId}>
            <SelectTrigger>
              <SelectValue placeholder="Pasta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Qualquer pasta</SelectItem>
              <SelectItem value={FOLDER_NONE}>Sem pasta</SelectItem>
              {folders.map((folder) => (
                <SelectItem key={folder.id} value={folder.id}>
                  {folder.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="view-participant">Participante</Label>
        <Input
          id="view-participant"
          value={participant}
          onChange={(event) => setParticipant(event.target.value)}
          placeholder="Nome ou e-mail"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={openActionsOnly}
          onCheckedChange={(checked) => setOpenActionsOnly(Boolean(checked))}
        />
        Só reuniões com atribuições abertas
      </label>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" variant="brand" disabled={busy}>
          Criar e abrir
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/vistas">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
