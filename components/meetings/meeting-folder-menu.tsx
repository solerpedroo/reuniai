"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FolderSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FolderWithCount } from "@/lib/folders/queries";

export function MeetingFolderMenu({
  meetingId,
  folderId,
  folders,
}: {
  meetingId: string;
  folderId: string | null;
  folders: FolderWithCount[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const current = folders.find((f) => f.id === folderId);

  async function moveTo(targetFolderId: string | null) {
    startTransition(async () => {
      await fetch(`/api/meetings/${meetingId}/folder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder_id: targetFolderId }),
      });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2 text-xs text-muted-foreground"
          disabled={pending}
          onClick={(e) => e.stopPropagation()}
        >
          <FolderSimple size={14} />
          {current?.name ?? "Pasta"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => void moveTo(null)}>Sem pasta</DropdownMenuItem>
        {folders.length > 0 && <DropdownMenuSeparator />}
        {folders.map((folder) => (
          <DropdownMenuItem key={folder.id} onClick={() => void moveTo(folder.id)}>
            <span
              className="mr-2 inline-block size-2 rounded-full"
              style={{ backgroundColor: folder.color }}
            />
            {folder.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
