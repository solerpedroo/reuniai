"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChatsCircle, PaperPlaneTilt, Quotes } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AssistantScope, GlobalCitation } from "@/lib/assistant/types";
import { formatTimestamp } from "@/lib/meetings/transcript";
import { cn } from "@/lib/utils";

const PROMPTS = [
  "O que ficou pendente nas últimas reuniões?",
  "Quais decisões sobre pricing tomamos?",
  "Liste action items abertos mencionados em calls recentes",
  "Resuma os temas recorrentes desta semana",
];

type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: GlobalCitation[];
};

const SCOPE_OPTIONS: { value: AssistantScope["type"]; label: string }[] = [
  { value: "all", label: "Tudo" },
  { value: "recent", label: "30 dias" },
];

export function GlobalAssistantChat({
  llmEnabled,
  initialScope,
}: {
  llmEnabled: boolean;
  initialScope: AssistantScope;
}) {
  const [scope, setScope] = useState<AssistantScope>(initialScope);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (!llmEnabled) {
    return (
      <EmptyState
        icon={ChatsCircle}
        tone="brand"
        title="Assistente indisponível"
        description="Configure um provedor de IA nas variáveis de ambiente para usar o assistente global."
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
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          scope,
          includeParticipantNotes: includeNotes,
        }),
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
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="flex flex-col gap-4">
        <div className="min-h-[360px] space-y-4 rounded-xl border border-border/70 bg-card/40 p-4">
          {messages.length === 0 && (
            <EmptyState
              icon={ChatsCircle}
              tone="brand"
              title="Pergunte sobre suas reuniões"
              description="A IA busca trechos relevantes em toda a biblioteca — com citações clicáveis."
              className="py-8"
            >
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => send(prompt)}
                    className="rounded-full border border-border/80 bg-background/80 px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-brand/40 hover:text-foreground"
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
                className={cn(
                  "max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-brand text-brand-foreground"
                    : "border border-border bg-card text-foreground"
                )}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.citations.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border/50 pt-2">
                    {msg.citations.map((c, i) => (
                      <Link
                        key={i}
                        href={`/reunioes/${c.meeting_id}?t=${c.start_ms}`}
                        className="inline-flex max-w-full items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-brand/10 hover:text-brand"
                      >
                        <Quotes size={10} className="shrink-0" />
                        <span className="truncate">
                          {c.meeting_title} · {formatTimestamp(c.start_ms)}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground">
                Pensando…
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte sobre todas as suas reuniões…"
            disabled={loading}
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()}>
            <PaperPlaneTilt size={16} />
          </Button>
        </form>
      </div>

      <aside className="space-y-4">
        <div className="surface-card space-y-3 p-4">
          <p className="text-sm font-medium">Escopo</p>
          <div className="flex flex-wrap gap-2">
            {SCOPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setScope(
                    option.value === "recent"
                      ? { type: "recent", days: 30 }
                      : { type: option.value }
                  )
                }
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  scope.type === option.value
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-border text-muted-foreground hover:border-brand/30"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          {initialScope.type === "series" && (
            <p className="text-xs text-muted-foreground">Escopo: série selecionada</p>
          )}
          {initialScope.type === "participant" && (
            <p className="text-xs text-muted-foreground">Escopo: participante selecionado</p>
          )}
        </div>

        <div className="surface-card flex items-start gap-2 p-4">
          <Checkbox
            id="include-notes"
            checked={includeNotes}
            onCheckedChange={(checked) => setIncludeNotes(checked === true)}
          />
          <Label htmlFor="include-notes" className="text-xs leading-relaxed text-muted-foreground">
            Incluir notas de participante no contexto (opt-in). Notas pessoais de reunião nunca
            entram.
          </Label>
        </div>
      </aside>
    </div>
  );
}
