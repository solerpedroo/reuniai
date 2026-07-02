"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TemplateCreateView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceSlug = searchParams.get("from");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  async function create() {
    if (!name.trim()) {
      toast.error("Informe um nome");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          sourceSlug: sourceSlug ?? undefined,
        }),
      });
      const data = (await res.json()) as { error?: string; template?: { id: string } };
      if (!res.ok || !data.template) throw new Error(data.error ?? "Falha ao criar");
      toast.success("Template criado");
      router.push(`/templates/${data.template.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/templates">
          <ArrowLeft size={16} className="mr-1.5" aria-hidden />
          Voltar
        </Link>
      </Button>

      <div className="surface-card space-y-4 p-5">
        {sourceSlug && (
          <p className="text-sm text-muted-foreground">
            Duplicando seções de <strong>{sourceSlug}</strong>
          </p>
        )}
        <div>
          <Label htmlFor="new-template-name">Nome</Label>
          <Input
            id="new-template-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5"
            placeholder="Ex.: Discovery semanal"
          />
        </div>
        <div>
          <Label htmlFor="new-template-description">Descrição</Label>
          <Input
            id="new-template-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1.5"
            placeholder="Opcional"
          />
        </div>
        <Button type="button" disabled={creating} onClick={() => void create()}>
          Criar template
        </Button>
      </div>
    </div>
  );
}
