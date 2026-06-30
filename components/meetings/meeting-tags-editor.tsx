"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Tag } from "@/lib/workflow/types";
import { cn } from "@/lib/utils";

const TAG_COLORS = ["#0064F5", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export function MeetingTagsEditor({
  meetingId,
  initialTags,
}: {
  meetingId: string;
  initialTags: Tag[];
}) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(initialTags.map((t) => t.id)));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/tags")
      .then((res) => res.json())
      .then((data) => setAllTags(data.tags ?? []));
  }, []);

  const toggle = useCallback((tagId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  }, []);

  const createTag = useCallback(async () => {
    const name = window.prompt("Nome da tag:");
    if (!name?.trim()) return;

    const color = TAG_COLORS[allTags.length % TAG_COLORS.length]!;
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), color }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Falha ao criar tag");
      return;
    }
    setAllTags((prev) => [...prev, data.tag]);
    setSelected((prev) => new Set([...prev, data.tag.id]));
    toast.success("Tag criada");
  }, [allTags.length]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/tags`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagIds: [...selected] }),
      });
      if (!res.ok) throw new Error("Falha ao salvar tags");
      toast.success("Tags atualizadas");
    } catch {
      toast.error("Falha ao salvar tags");
    } finally {
      setSaving(false);
    }
  }, [meetingId, selected]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {allTags.map((tag) => {
          const active = selected.has(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggle(tag.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active ? "border-transparent text-white" : "border-border/60 text-muted-foreground"
              )}
              style={active ? { backgroundColor: tag.color } : undefined}
            >
              {tag.name}
            </button>
          );
        })}
        <Button variant="outline" size="sm" onClick={createTag}>
          + Nova tag
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={save} disabled={saving}>
          Salvar tags
        </Button>
        {initialTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {initialTags.map((tag) => (
              <Badge key={tag.id} variant="secondary" style={{ borderColor: tag.color }}>
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
