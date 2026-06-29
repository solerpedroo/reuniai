"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash } from "@phosphor-icons/react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DeleteMeetingButton({
  meetingId,
  meetingTitle,
  menuItem = false,
  onOpenChange,
}: {
  meetingId: string;
  meetingTitle: string;
  menuItem?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);

  const canDelete = confirmation === "DELETAR";

  async function handleDelete() {
    if (!canDelete) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error ?? "Falha ao excluir reunião.");
        return;
      }

      toast.success("Reunião excluída.");
      setOpen(false);
      router.push("/reunioes");
      router.refresh();
    } catch {
      toast.error("Erro de rede ao excluir reunião.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        onOpenChange?.(next);
        if (!next) setConfirmation("");
      }}
    >
      <DialogTrigger asChild>
        {menuItem ? (
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
          >
            <Trash size={16} />
            Excluir reunião
          </button>
        ) : (
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
            <Trash size={14} className="mr-1.5" />
            Excluir
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="surface-modal border-0 shadow-none sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir reunião</DialogTitle>
          <DialogDescription>
            A reunião <strong>{meetingTitle}</strong> e todos os dados associados (transcrição,
            resumo, chat e gravação) serão removidos permanentemente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="delete-meeting-confirm">
            Digite <span className="font-mono font-semibold">DELETAR</span> para confirmar
          </Label>
          <Input
            id="delete-meeting-confirm"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="DELETAR"
            autoComplete="off"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!canDelete || loading}
          >
            {loading ? "Excluindo…" : "Excluir reunião"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
