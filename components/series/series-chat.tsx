"use client";

import { useState } from "react";
import { PaperPlaneRight, Sparkle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const PROMPTS = [
  "O que mudou nas últimas 3 reuniões?",
  "Quais action items ficaram pendentes?",
  "Resuma a evolução da série",
];

export function SeriesChat({ recurringEventId }: { recurringEventId: string }) {
  const [message, setMessage] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const send = async (text: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/series/${encodeURIComponent(recurringEventId)}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha no chat");
      setAnswer(data.answer);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no chat da série");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="surface-card space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Sparkle size={18} className="text-brand" />
        <h2 className="text-sm font-medium">Chat da série</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Perguntas sobre todas as ocorrências desta série recorrente.
      </p>
      <div className="flex flex-wrap gap-2">
        {PROMPTS.map((prompt) => (
          <Button
            key={prompt}
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => {
              setMessage(prompt);
              void send(prompt);
            }}
          >
            {prompt}
          </Button>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!message.trim()) return;
          void send(message.trim());
        }}
      >
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Pergunte sobre a série…"
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !message.trim()}>
          <PaperPlaneRight size={16} />
        </Button>
      </form>
      {answer && (
        <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
}
