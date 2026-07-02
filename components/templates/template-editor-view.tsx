"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FloppyDisk, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { AnalysisTemplateRecord, TemplateSection } from "@/lib/analysis/template-catalog";

export function TemplateEditorView({
  template,
}: {
  template: AnalysisTemplateRecord;
}) {
  const router = useRouter();
  const readOnly = template.is_builtin;
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description ?? "");
  const [sections, setSections] = useState<TemplateSection[]>(template.sections);
  const [saving, setSaving] = useState(false);

  function toggleSection(id: string, enabled: boolean) {
    setSections((current) =>
      current.map((section) => (section.id === id ? { ...section, enabled } : section))
    );
  }

  async function save() {
    if (readOnly) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, sections }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Falha ao salvar");
      toast.success("Template salvo");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (readOnly) return;
    if (!confirm("Excluir este template?")) return;
    const res = await fetch(`/api/templates/${template.id}`, { method: "DELETE" });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error(data.error ?? "Falha ao excluir");
      return;
    }
    toast.success("Template excluído");
    router.push("/templates");
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/templates">
          <ArrowLeft size={16} className="mr-1.5" aria-hidden />
          Voltar à galeria
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="surface-card space-y-4 p-5">
          <div>
            <Label htmlFor="template-name">Nome</Label>
            <Input
              id="template-name"
              value={name}
              disabled={readOnly}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="template-description">Descrição</Label>
            <Input
              id="template-description"
              value={description}
              disabled={readOnly}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1.5"
            />
          </div>

          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={saving} onClick={() => void save()}>
                <FloppyDisk size={14} aria-hidden />
                Salvar
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => void remove()}>
                <Trash size={14} aria-hidden />
                Excluir
              </Button>
            </div>
          )}

          {readOnly && (
            <p className="text-sm text-muted-foreground">
              Templates built-in são somente leitura —{" "}
              <Link href={`/templates/novo?from=${template.slug}`} className="text-brand hover:underline">
                duplique
              </Link>{" "}
              para personalizar.
            </p>
          )}
        </div>

        <div className="surface-card space-y-3 p-5">
          <h2 className="text-sm font-semibold">Seções do resumo</h2>
          <ul className="space-y-3">
            {sections.map((section) => (
              <li
                key={section.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium">{section.label}</p>
                  <p className="text-xs text-muted-foreground">{section.id}</p>
                </div>
                <Switch
                  checked={section.enabled}
                  disabled={readOnly}
                  onCheckedChange={(enabled) => toggleSection(section.id, enabled)}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
