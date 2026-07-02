import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { TemplateCreateView } from "@/components/templates/template-create-view";

export default function TemplateNovoPage() {
  return (
    <div>
      <PageHeader
        title="Novo template"
        description="Crie do zero ou duplique um built-in como ponto de partida."
        meta="Criar"
      />
      <Suspense fallback={null}>
        <TemplateCreateView />
      </Suspense>
    </div>
  );
}
