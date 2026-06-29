"use client";

import { useEffect, useRef, useState } from "react";
import { PaperPlaneTilt, Quotes, Robot, Sparkle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import type { Citation } from "@/lib/meetings/chat";
import { formatTimestamp } from "@/lib/meetings/transcript";

const MEETING_PROMPTS = [
  "Quais foram as decisões tomadas?",
  "Liste todos os itens de ação",
  "Resuma em 3 bullet points",
  "O que ficou pendente?",
];

type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
};

export function MeetingChat({
  meetingId,
  initialMessages,
  llmEnabled,
}: {
  meetingId: string;
  initialMessages: UiMessage[];
  llmEnabled: boolean;
}) {
  const [messages, setMessages] = useState<UiMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (!llmEnabled) {
    return (
      <EmptyState
        icon={Robot}
        tone="brand"
        title="Chat indisponível"
        description="Configure um provedor de IA (Groq, OpenAI ou Anthropic) nas variáveis de ambiente para conversar sobre esta reunião."
      />
    );
  }

  async function send(text: string) {
    const question = text.trim();
    if (!question || loading) return;

    const userMsg: UiMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content: question,
      citations: [],
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`/api/meetings/${meetingId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Falha ao enviar mensagem.");
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.content,
          citations: data.citations ?? [],
        },
      ]);
    } catch {
      toast.error("Falha de conexão.");
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="min-h-[280px] space-y-4">
        {messages.length === 0 && (
          <EmptyState
            icon={Sparkle}
            tone="brand"
            title="Pergunte sobre esta reunião"
            description="A IA usa a transcrição e o resumo como contexto. Experimente um dos prompts abaixo."
            className="py-8"
          >
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {MEETING_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => send(prompt)}
                  className="rounded-full border border-border/80 bg-background/80 px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-brand/40 hover:text-foreground hover:shadow-sm"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </EmptyState>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-brand text-brand-foreground"
                  : "border border-border bg-card text-foreground"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.citations.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border/50 pt-2">
                  {msg.citations.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toast(formatTimestamp(c.start_ms), { description: c.text })}
                      className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs tabular-nums text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Quotes size={10} />
                      {formatTimestamp(c.start_ms)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground">
              <span className="flex gap-1">
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
              </span>
              Pensando…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunte sobre a reunião…"
          disabled={loading}
        />
        <Button type="submit" size="icon" disabled={loading || !input.trim()}>
          <PaperPlaneTilt size={16} />
        </Button>
      </form>
    </div>
  );
}
