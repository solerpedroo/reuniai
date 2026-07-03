import { PageHeader } from "@/components/layout/page-header";
import { RehearsalChat } from "@/components/rehearsal/rehearsal-chat";
import { isLlmConfigured } from "@/lib/llm/client";

export default function EnsaiarPage() {
  const llmEnabled = isLlmConfigured();

  return (
    <div>
      <PageHeader
        title="Ensaio de conversa"
        description="Pratique conversas difíceis com um interlocutor simulado por IA."
        meta="Roleplay"
      />
      <RehearsalChat llmEnabled={llmEnabled} />
    </div>
  );
}
