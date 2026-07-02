"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle,
  ClipboardText,
  EnvelopeSimple,
  ShareNetwork,
  Sparkle,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { ActionItemsTab } from "@/components/meetings/action-items-tab";
import { ExportMeetingButton } from "@/components/meetings/export-meeting-button";
import { FollowUpTab } from "@/components/meetings/follow-up-tab";
import { ShareLinkDialog } from "@/components/meetings/share-link-dialog";
import { SummaryView } from "@/components/meetings/summary-view";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { needsPostCallReview } from "@/lib/meetings/post-call-review";
import type { ActionItem, Meeting, MeetingSummary } from "@/lib/supabase/types";
import type { MeetingFollowUp } from "@/lib/workflow/types";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    key: "assignments",
    title: "Atribuições",
    description: "Aceite sugestões da IA e confira os compromissos da call.",
    icon: CheckCircle,
    optional: false,
  },
  {
    key: "summary",
    title: "Resumo",
    description: "Revise o resumo executivo antes de compartilhar.",
    icon: Sparkle,
    optional: true,
  },
  {
    key: "followup",
    title: "Follow-up",
    description: "Gere ou edite o rascunho de email para os participantes.",
    icon: EnvelopeSimple,
    optional: false,
  },
  {
    key: "share",
    title: "Compartilhar",
    description: "Exporte ou crie um link read-only da reunião.",
    icon: ShareNetwork,
    optional: false,
  },
] as const;

type MeetingReviewWizardProps = {
  meeting: Meeting;
  summary: MeetingSummary | null;
  actionItems: ActionItem[];
  followUp: MeetingFollowUp | null;
  llmEnabled: boolean;
  forceOpen?: boolean;
};

export function MeetingReviewWizard({
  meeting,
  summary,
  actionItems,
  followUp,
  llmEnabled,
  forceOpen = false,
}: MeetingReviewWizardProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [reviewedAt, setReviewedAt] = useState(meeting.meeting_reviewed_at);

  const pendingReview = needsPostCallReview({ ...meeting, meeting_reviewed_at: reviewedAt });

  useEffect(() => {
    if (pendingReview || (forceOpen && meeting.status === "completed" && !reviewedAt)) {
      setOpen(true);
    }
  }, [pendingReview, forceOpen, meeting.status, reviewedAt]);

  const current = STEPS[step]!;
  const isLast = step === STEPS.length - 1;

  const completeReview = useCallback(async () => {
    setCompleting(true);
    try {
      const res = await fetch(`/api/meetings/${meeting.id}/review`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Não foi possível concluir a revisão.");
        return false;
      }
      setReviewedAt(data.meeting_reviewed_at ?? new Date().toISOString());
      setOpen(false);
      router.refresh();
      toast.success("Reunião revisada. Bom trabalho!");
      return true;
    } finally {
      setCompleting(false);
    }
  }, [meeting.id, router]);

  async function handleNext() {
    if (isLast) {
      await completeReview();
      return;
    }
    setStep((value) => Math.min(value + 1, STEPS.length - 1));
  }

  function handleBack() {
    setStep((value) => Math.max(value - 1, 0));
  }

  if (!pendingReview && reviewedAt && !open) {
    return null;
  }

  return (
    <>
      {pendingReview && !open && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/25 bg-brand/5 px-4 py-3">
          <div className="flex items-start gap-3">
            <ClipboardText size={20} className="mt-0.5 shrink-0 text-brand" aria-hidden />
            <div>
              <p className="text-sm font-medium text-foreground">Fechar a call</p>
              <p className="text-sm text-muted-foreground">
                Revise atribuições, follow-up e compartilhamento em poucos minutos.
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => setOpen(true)}>
            Revisar reunião
          </Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[min(90vh,820px)] flex-col gap-0 overflow-hidden border-brand/15 p-0 sm:max-w-3xl">
          <DialogHeader className="space-y-4 border-b border-border/70 px-6 py-5">
            <div>
              <DialogTitle>Revisar reunião</DialogTitle>
              <DialogDescription className="truncate">{meeting.title}</DialogDescription>
            </div>

            <ol className="flex flex-wrap gap-2">
              {STEPS.map((item, index) => {
                const done = index < step;
                const active = index === step;
                return (
                  <li
                    key={item.key}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium",
                      active
                        ? "border-brand/30 bg-brand/10 text-brand"
                        : done
                          ? "border-border bg-muted/50 text-foreground"
                          : "border-border text-muted-foreground"
                    )}
                  >
                    {done ? <Check size={12} /> : <item.icon size={12} />}
                    {item.title}
                  </li>
                );
              })}
            </ol>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.key}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-base font-semibold">{current.title}</h3>
                  <p className="text-sm text-muted-foreground">{current.description}</p>
                </div>

                {current.key === "assignments" && (
                  <ActionItemsTab meetingId={meeting.id} initialItems={actionItems} />
                )}

                {current.key === "summary" && (
                  <SummaryView
                    summary={summary}
                    visibility={{
                      executive_summary: true,
                      topics: true,
                      decisions: true,
                      talk_time: false,
                    }}
                  />
                )}

                {current.key === "followup" && (
                  <FollowUpTab
                    meetingId={meeting.id}
                    initialFollowUp={followUp}
                    llmEnabled={llmEnabled}
                  />
                )}

                {current.key === "share" && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Compartilhe o essencial com quem não estava na call ou exporte para seus
                      arquivos.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <ShareLinkDialog meetingId={meeting.id} />
                      <ExportMeetingButton meetingId={meeting.id} />
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 px-6 py-4">
            <Button variant="ghost" onClick={handleBack} disabled={step === 0 || completing}>
              <ArrowLeft size={14} />
              Voltar
            </Button>

            <div className="flex flex-wrap gap-2">
              {current.optional && !isLast && (
                <Button variant="outline" onClick={handleNext} disabled={completing}>
                  Pular
                </Button>
              )}
              <Button variant="brand" onClick={() => void handleNext()} disabled={completing}>
                {isLast ? (
                  completing ? (
                    "Concluindo…"
                  ) : (
                    <>
                      <Check size={14} />
                      Concluir revisão
                    </>
                  )
                ) : (
                  <>
                    Próximo
                    <ArrowRight size={14} />
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
