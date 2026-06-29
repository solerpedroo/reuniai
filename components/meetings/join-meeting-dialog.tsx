"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { LinkSimple, Plus, Robot, Spinner } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { MeetingUrlPreviewCard } from "@/components/meetings/meeting-url-preview";
import { easePremium } from "@/components/motion/presets";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { previewMeetingUrlInput } from "@/lib/meetings/normalize-meeting-url";
import { cn } from "@/lib/utils";

type JoinMeetingDialogProps = {
  triggerClassName?: string;
  defaultOpen?: boolean;
};

export function JoinMeetingDialog({
  triggerClassName,
  defaultOpen = false,
}: JoinMeetingDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [title, setTitle] = useState("");
  const [startBot, setStartBot] = useState(true);
  const [pending, startTransition] = useTransition();

  const preview = useMemo(() => previewMeetingUrlInput(meetingUrl), [meetingUrl]);
  const canSubmit = preview.botSupported && !pending;

  function handleSubmit() {
    if (!canSubmit) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/meetings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            meetingUrl,
            title: title.trim() || undefined,
            startBot,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          toast.error(data.error ?? "Não foi possível iniciar a reunião.");
          return;
        }

        if (data.reused) {
          toast.message("Reunião já ativa", {
            description: "Reutilizamos a sessão existente para este link.",
          });
        } else {
          toast.success("Reunião criada com sucesso.");
        }

        if (startBot) {
          if (data.botStarted) {
            toast.success("Bot enviado — entrando na call.");
          } else if (data.botError) {
            toast.error(data.botError);
          }
        }

        setOpen(false);
        setMeetingUrl("");
        setTitle("");
        router.push(`/reunioes/${data.meetingId}`);
        router.refresh();
      } catch {
        toast.error("Falha de conexão. Tente novamente.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setMeetingUrl("");
          setTitle("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="brand" className={cn("brand-glow", triggerClassName)}>
          <Plus size={16} weight="bold" />
          Nova reunião
        </Button>
      </DialogTrigger>

      <DialogContent className="overflow-hidden border-brand/15 p-0 sm:max-w-[520px]">
        <div className="brand-gradient relative px-6 pb-8 pt-6 text-white">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.22),transparent_55%)]" />
          <DialogHeader className="relative space-y-2 text-left">
            <div className="mb-1 inline-flex size-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
              <LinkSimple size={22} weight="duotone" aria-hidden />
            </div>
            <DialogTitle className="text-xl text-white">Entrar com link</DialogTitle>
            <DialogDescription className="text-white/80">
              Cole o link da call — mesmo fora da sua agenda. O bot entra, grava e gera
              transcrição automaticamente.
            </DialogDescription>
          </DialogHeader>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: easePremium, delay: 0.05 }}
          className="space-y-5 px-6 pb-6 pt-2"
        >
          <div className="space-y-2">
            <Label htmlFor="meeting-url">Link da reunião</Label>
            <Input
              id="meeting-url"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://meet.google.com/abc-defg-hij"
              className="h-11 border-brand/20 bg-background/80 transition-shadow focus-visible:ring-brand/30"
              autoComplete="off"
              autoFocus
            />
          </div>

          <MeetingUrlPreviewCard preview={preview} />

          <div className="space-y-2">
            <Label htmlFor="meeting-title">Título (opcional)</Label>
            <Input
              id="meeting-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Alinhamento com cliente"
              className="h-10"
              maxLength={200}
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-3 transition-colors hover:bg-muted/35">
            <Checkbox
              checked={startBot}
              onCheckedChange={(checked) => setStartBot(checked === true)}
              className="mt-0.5"
            />
            <span className="space-y-0.5">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Robot size={16} className="text-brand" />
                Enviar bot imediatamente
              </span>
              <span className="block text-xs text-muted-foreground">
                O ReuniAI entra na call agora para gravar e transcrever.
              </span>
            </span>
          </label>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Ao continuar, você confirma que os participantes foram informados sobre a gravação.{" "}
            <Link href="/recording-notice" className="text-brand hover:underline">
              Saiba mais
            </Link>
          </p>
        </motion.div>

        <DialogFooter className="border-t border-border/70 bg-muted/15 px-6 py-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="brand" disabled={!canSubmit} onClick={handleSubmit} className="min-w-36">
            {pending ? (
              <>
                <Spinner size={16} className="animate-spin" />
                Enviando…
              </>
            ) : startBot ? (
              <>
                <Robot size={16} />
                Enviar bot
              </>
            ) : (
              "Criar reunião"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
