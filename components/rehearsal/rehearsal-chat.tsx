"use client";

import { useCallback, useState } from "react";
import { PaperPlaneTilt, Sparkle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ChatMessage = { role: "user" | "assistant"; content: string };

export function RehearsalChat({ llmEnabled }: { llmEnabled: boolean }) {
  const [scenario, setScenario] = useState("");
  const [participantKey, setParticipantKey] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [rehearsalId, setRehearsalId] = useState<string | undefined>();
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);

  const send = useCallback(
    async (endSession = false) => {
      if (!input.trim() && !endSession) return;
      if (!scenario.trim()) {
        toast.error("Descreva o cenário antes de começar");
        return;
      }

      setLoading(true);
      try {
        const res = await fetch("/api/rehearsal/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rehearsalId,
            scenario,
            participantKey: participantKey || undefined,
            message: endSession ? "(encerrar sessão)" : input,
            messages,
            endSession,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Falha na resposta");

        setRehearsalId(data.rehearsalId);
        setMessages(data.messages);
        if (data.summary) setSummary(data.summary);
        if (!endSession) setInput("");
        if (!started) setStarted(true);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro no ensaio");
      } finally {
        setLoading(false);
      }
    },
    [input, messages, participantKey, rehearsalId, scenario, started]
  );

  if (!llmEnabled) {
    return (
      <div className="surface-card p-6 text-sm text-muted-foreground">
        Configure um provedor de IA (GROQ, OpenAI ou Anthropic) para usar o ensaio de conversa.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!started && (
        <div className="surface-card space-y-4 p-6">
          <div className="space-y-2">
            <label htmlFor="scenario" className="text-sm font-medium">
              Cenário
            </label>
            <Textarea
              id="scenario"
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              rows={3}
              placeholder="Ex.: Negociar prazo de entrega com cliente insatisfeito…"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="participant" className="text-sm font-medium">
              Interlocutor (opcional)
            </label>
            <Input
              id="participant"
              value={participantKey}
              onChange={(e) => setParticipantKey(e.target.value)}
              placeholder="Nome ou papel da outra pessoa"
            />
          </div>
          <Button
            variant="brand"
            onClick={() => {
              setStarted(true);
              setMessages([]);
            }}
            disabled={!scenario.trim()}
          >
            <Sparkle size={16} className="mr-1.5" />
            Iniciar ensaio
          </Button>
        </div>
      )}

      {started && (
        <>
          <div className="surface-card min-h-[240px] space-y-3 p-4">
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">Envie a primeira mensagem para começar o diálogo.</p>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    m.role === "user" ? "ml-8 bg-brand/10" : "mr-8 bg-muted"
                  }`}
                >
                  <p className="mb-0.5 text-xs font-medium text-muted-foreground">
                    {m.role === "user" ? "Você" : "Interlocutor"}
                  </p>
                  {m.content}
                </div>
              ))
            )}
          </div>

          {summary && (
            <div className="surface-card p-4 text-sm">
              <p className="mb-2 font-medium">Resumo do ensaio</p>
              <p className="whitespace-pre-wrap text-muted-foreground">{summary}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Sua fala…"
              disabled={loading || !!summary}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(false);
                }
              }}
            />
            <Button variant="brand" disabled={loading || !!summary} onClick={() => void send(false)}>
              <PaperPlaneTilt size={16} />
            </Button>
            <Button variant="outline" disabled={loading || messages.length < 2 || !!summary} onClick={() => void send(true)}>
              Encerrar
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
