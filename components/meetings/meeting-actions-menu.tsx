"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowsClockwise,
  DotsThreeVertical,
  DownloadSimple,
  Spinner,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { BotActions } from "@/components/meetings/bot-actions";
import { DeleteMeetingButton } from "@/components/meetings/delete-meeting-button";
import { Button } from "@/components/ui/button";
import type { MeetingStatus } from "@/lib/supabase/types";

export function MeetingActionsMenu({
  meetingId,
  meetingTitle,
  status,
}: {
  meetingId: string;
  meetingTitle: string;
  status: MeetingStatus;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className="flex items-center gap-2">
      <BotActions meetingId={meetingId} status={status} />

      <div className="relative" ref={menuRef}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="size-9 px-0"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="Mais ações"
        >
          <DotsThreeVertical size={16} weight="bold" />
        </Button>

        {open && (
          <div
            role="menu"
            className="surface-elevated absolute right-0 z-50 mt-1.5 min-w-[12rem] overflow-hidden py-1"
          >
            <MenuLink
              href={`/api/meetings/${meetingId}/export?format=md`}
              icon={DownloadSimple}
              label="Exportar Markdown"
              onSelect={() => setOpen(false)}
            />
            <SyncMenuItem meetingId={meetingId} onDone={() => setOpen(false)} />
            <div className="my-1 h-px bg-border/70" />
            <DeleteMeetingButton
              meetingId={meetingId}
              meetingTitle={meetingTitle}
              menuItem
              onOpenChange={(next) => {
                if (next) setOpen(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  label,
  onSelect,
}: {
  href: string;
  icon: typeof DownloadSimple;
  label: string;
  onSelect: () => void;
}) {
  return (
    <a
      role="menuitem"
      href={href}
      download
      onClick={onSelect}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted/50"
    >
      <Icon size={16} className="text-muted-foreground" />
      {label}
    </a>
  );
}

function SyncMenuItem({
  meetingId,
  onDone,
}: {
  meetingId: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function sync() {
    setLoading(true);
    try {
      const res = await fetch("/api/bots/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Falha ao buscar transcrição.");
        return;
      }
      toast.success(
        data?.segments > 0
          ? `Transcrição atualizada (${data.segments} trechos).`
          : "Sem trechos disponíveis ainda."
      );
      router.refresh();
      onDone();
    } catch {
      toast.error("Falha de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      role="menuitem"
      disabled={loading}
      onClick={sync}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted/50 disabled:opacity-50"
    >
      {loading ? (
        <Spinner size={16} className="animate-spin text-muted-foreground" />
      ) : (
        <ArrowsClockwise size={16} className="text-muted-foreground" />
      )}
      Buscar transcrição
    </button>
  );
}
