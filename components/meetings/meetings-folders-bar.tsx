"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition, useState } from "react";
import { Folder, FolderOpen, Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FOLDER_NONE } from "@/lib/folders/constants";
import type { FolderWithCount } from "@/lib/folders/queries";
import { cn } from "@/lib/utils";

export function MeetingsFoldersBar({
  folders,
  activeFolderId,
  unassignedCount,
}: {
  folders: FolderWithCount[];
  activeFolderId?: string;
  unassignedCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  function navigateFolder(folderId: string | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (folderId) params.set("pasta", folderId);
    else params.delete("pasta");
    params.delete("cursor");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  async function createFolder() {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) return;
      setCreateOpen(false);
      setNewName("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="surface-toolbar space-y-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Folder size={16} className="text-muted-foreground" />
            Pastas
            {pending && <span className="text-xs font-normal text-muted-foreground">…</span>}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={14} className="mr-1" />
            Nova pasta
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigateFolder(undefined)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
              !activeFolderId
                ? "border-brand bg-brand/10 text-brand"
                : "border-border text-muted-foreground hover:border-brand/40"
            )}
          >
            <FolderOpen size={14} />
            Todas
          </button>

          <button
            type="button"
            onClick={() => navigateFolder(FOLDER_NONE)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
              activeFolderId === FOLDER_NONE
                ? "border-brand bg-brand/10 text-brand"
                : "border-border text-muted-foreground hover:border-brand/40"
            )}
          >
            Sem pasta
            <span className="tabular-nums text-muted-foreground">({unassignedCount})</span>
          </button>

          {folders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => navigateFolder(folder.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
                activeFolderId === folder.id
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-border text-muted-foreground hover:border-brand/40"
              )}
            >
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: folder.color }}
                aria-hidden
              />
              {folder.name}
              <span className="tabular-nums text-muted-foreground">({folder.meetingCount})</span>
            </button>
          ))}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova pasta</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Nome da pasta"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void createFolder();
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void createFolder()} disabled={saving || !newName.trim()}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
