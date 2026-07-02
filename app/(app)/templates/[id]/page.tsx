import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { TemplateEditorView } from "@/components/templates/template-editor-view";
import { getAnalysisTemplate } from "@/lib/analysis/template-library";
import { createClient } from "@/lib/supabase/server";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const template = await getAnalysisTemplate(supabase, id);

  if (!template) notFound();

  return (
    <div>
      <PageHeader
        title={template.name}
        description={template.description ?? "Editor de seções do template"}
        meta={template.is_builtin ? "Built-in" : "Custom"}
      />
      <TemplateEditorView template={template} />
    </div>
  );
}
