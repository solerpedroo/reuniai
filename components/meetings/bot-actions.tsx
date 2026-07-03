"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Robot, Spinner, StopCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { canSendBot, canStopBot } from "@/lib/meetings/bot-lifecycle";
import type { MeetingStatus } from "@/lib/supabase/types";

export function BotActions({
  meetingId,
  status,
  recallBotId = null,
  preferNativeTranscript = false,
}: {
  meetingId: string;
  status: MeetingStatus;
  recallBotId?: string | null;
  preferNativeTranscript?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function call(path: string, successMsg: string) {
    setLoading(true);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Algo deu errado.");
        return;
      }
      if (data?.alreadyStopped) {
        toast.info("O bot já havia encerrado.");
      } else {
        toast.success(successMsg);
      }
      router.refresh();
    } catch {
      toast.error("Falha de conexão.");
    } finally {
      setLoading(false);
    }
  }

  if (canStopBot(status, recallBotId, preferNativeTranscript)) {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={loading}
        onClick={() => call("/api/bots/stop", "Bot encerrado.")}
      >
        {loading ? <Spinner size={14} className="animate-spin" /> : <StopCircle size={14} />}
        Parar bot
      </Button>
    );
  }

  if (canSendBot(status, preferNativeTranscript)) {
    return (
      <Button
        size="sm"
        variant="brand"
        disabled={loading}
        onClick={() => call("/api/bots/start", "Bot enviado para a reunião.")}
      >
        {loading ? <Spinner size={14} className="animate-spin" /> : <Robot size={14} />}
        Enviar bot
      </Button>
    );
  }

  return null;
}
