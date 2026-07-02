import Link from "next/link";
import {
  ClipboardText,
  Copy,
  Lightning,
  Plus,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import type { AnalysisTemplateRecord } from "@/lib/analysis/template-catalog";

export function TemplatesGalleryView({
  templates,
}: {
  templates: (AnalysisTemplateRecord & { seriesCount: number })[];
}) {
  const builtins = templates.filter((t) => t.is_builtin);
  const custom = templates.filter((t) => !t.is_builtin);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href="/templates/novo">
            <Plus size={14} aria-hidden />
            Novo template
          </Link>
        </Button>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Built-in</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {builtins.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Personalizados</h2>
        {custom.length === 0 ? (
          <div className="surface-card p-8 text-center text-sm text-muted-foreground">
            Duplique um built-in ou crie do zero para personalizar seções do resumo IA.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {custom.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TemplateCard({
  template,
}: {
  template: AnalysisTemplateRecord & { seriesCount: number };
}) {
  return (
    <div className="surface-card flex h-full flex-col p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          {template.is_builtin ? (
            <Lightning size={18} aria-hidden />
          ) : (
            <ClipboardText size={18} aria-hidden />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{template.name}</p>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {template.description ?? "Sem descrição"}
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {template.sections.filter((s) => s.enabled).length} seções ·{" "}
        {template.seriesCount > 0
          ? `Usado em ${template.seriesCount} série${template.seriesCount === 1 ? "" : "s"}`
          : "Não usado em séries"}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/templates/${template.id}`}>Abrir</Link>
        </Button>
        {template.is_builtin && (
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/templates/novo?from=${template.slug}`}>
              <Copy size={14} aria-hidden />
              Duplicar
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
