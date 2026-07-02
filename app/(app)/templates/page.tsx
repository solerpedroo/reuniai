import { PageHeader } from "@/components/layout/page-header";
import { TemplatesGalleryView } from "@/components/templates/templates-gallery-view";
import {
  countSeriesUsingTemplateSlug,
  listAnalysisTemplates,
} from "@/lib/analysis/template-library";
import { createClient } from "@/lib/supabase/server";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const templates = await listAnalysisTemplates(supabase);
  const withUsage = await Promise.all(
    templates.map(async (template) => ({
      ...template,
      seriesCount: await countSeriesUsingTemplateSlug(supabase, template.slug),
    }))
  );

  return (
    <div>
      <PageHeader
        title="Templates de análise"
        description="Personalize seções do resumo IA — standup, 1:1, retro e templates customizados."
        meta="Biblioteca"
      />
      <TemplatesGalleryView templates={withUsage} />
    </div>
  );
}
