"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { BookmarkSimple, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatTimestamp } from "@/lib/meetings/transcript";
import type { MeetingComment } from "@/lib/workflow/types";

export function MeetingCommentsPanel({
  meetingId,
  initialComments,
  currentTimeMs,
  onSeek,
}: {
  meetingId: string;
  initialComments: MeetingComment[];
  currentTimeMs: number;
  onSeek: (ms: number) => void;
}) {
  const [comments, setComments] = useState(initialComments);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  const base = `/api/meetings/${meetingId}/comments`;

  const addComment = useCallback(async () => {
    if (!label.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), start_ms: Math.round(currentTimeMs) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Falha ao salvar nota");
        return;
      }
      setComments((prev) =>
        [...prev, data.comment as MeetingComment].sort((a, b) => a.start_ms - b.start_ms)
      );
      setLabel("");
      toast.success("Momento marcado");
    } finally {
      setBusy(false);
    }
  }, [base, currentTimeMs, label]);

  const removeComment = useCallback(
    async (commentId: string) => {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      const res = await fetch(`${base}/${commentId}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Falha ao remover nota");
        await fetch(base)
          .then((r) => r.json())
          .then((d) => setComments(d.comments ?? []));
      }
    },
    [base]
  );

  return (
    <div className="rounded-lg border border-border/70 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium flex items-center gap-1.5">
          <BookmarkSimple size={16} className="text-brand" />
          Notas na timeline
        </p>
        <div className="flex items-center gap-2">
          {comments.length > 0 && (
            <Link
              href={`/comentarios?meeting=${meetingId}`}
              className="text-xs text-muted-foreground hover:text-brand"
            >
              Ver todos
            </Link>
          )}
          <span className="text-xs text-muted-foreground font-mono">
            {formatTimestamp(Math.round(currentTimeMs))}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Anotação neste momento..."
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void addComment();
          }}
        />
        <Button size="sm" disabled={busy || !label.trim()} onClick={() => void addComment()}>
          Marcar momento
        </Button>
      </div>

      {comments.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Marque momentos importantes durante a revisão da gravação.
        </p>
      ) : (
        <ul className="space-y-2">
          {comments.map((comment) => (
            <li
              key={comment.id}
              className="flex items-start justify-between gap-2 rounded-md border border-border/60 px-3 py-2 text-sm"
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left hover:text-brand"
                onClick={() => onSeek(comment.start_ms)}
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {formatTimestamp(comment.start_ms)}
                </span>
                <p className="mt-0.5">{comment.label}</p>
              </button>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 shrink-0 text-muted-foreground"
                onClick={() => void removeComment(comment.id)}
              >
                <Trash size={14} />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
