"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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

export function DeleteAccountDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);

  const canDelete = confirmation === "DELETAR";

  async function handleDelete() {
    if (!canDelete) return;

    setLoading(true);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETAR" }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error ?? "Falha ao deletar conta.");
        return;
      }

      toast.success("Conta excluída com sucesso.");
      setOpen(false);
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Erro de rede ao deletar conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setConfirmation("");
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="text-destructive hover:text-destructive">
          Deletar conta
        </Button>
      </DialogTrigger>
      <DialogContent className="surface-modal border-0 shadow-none sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir conta permanentemente</DialogTitle>
          <DialogDescription>
            Esta ação remove todas as reuniões, transcrições, resumos, gravações e dados
            conectados. Não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="delete-account-confirm">
            Digite <span className="font-mono font-semibold">DELETAR</span> para confirmar
          </Label>
          <Input
            id="delete-account-confirm"
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
            {loading ? "Excluindo…" : "Excluir conta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
