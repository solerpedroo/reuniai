import { CheckCircle, Circle, User } from "@phosphor-icons/react/dist/ssr";
import type { ActionItem } from "@/lib/supabase/types";

function formatDueDate(date: string | null): string | null {
  if (!date) return null;
  try {
    return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return date;
  }
}

export function ActionItemsList({ items }: { items: ActionItem[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
        Nenhum item de ação identificado nesta reunião.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const done = item.status === "done";
        const due = formatDueDate(item.due_date);
        return (
          <li
            key={item.id}
            className="flex items-start gap-3 rounded-lg border border-border p-4"
          >
            {done ? (
              <CheckCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-brand" />
            ) : (
              <Circle size={18} className="mt-0.5 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0 flex-1">
              <p className={`text-sm ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                {item.title}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {item.assignee && (
                  <span className="inline-flex items-center gap-1">
                    <User size={12} />
                    {item.assignee}
                  </span>
                )}
                {due && <span>Prazo: {due}</span>}
                {item.source === "ai" && (
                  <span className="rounded bg-brand/10 px-1.5 py-0.5 text-brand">IA</span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
