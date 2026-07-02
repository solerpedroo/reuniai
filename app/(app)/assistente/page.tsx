import { PageHeader } from "@/components/layout/page-header";
import { GlobalAssistantChat } from "@/components/assistant/global-assistant-chat";
import { parseAssistantScope } from "@/lib/assistant/scope";
import { isLlmConfigured } from "@/lib/llm/client";

export default async function AssistentePage({
  searchParams,
}: {
  searchParams: Promise<{ escopo?: string; id?: string; key?: string; dias?: string }>;
}) {
  const params = await searchParams;
  const initialScope = parseAssistantScope(params);

  return (
    <div>
      <PageHeader
        title="Assistente"
        description="Perguntas em linguagem natural sobre toda a sua biblioteca de reuniões — com citações verificáveis."
        meta="IA"
      />
      <GlobalAssistantChat llmEnabled={isLlmConfigured()} initialScope={initialScope} />
    </div>
  );
}
