import Link from "next/link";
import { CheckCircle, Warning } from "@phosphor-icons/react/dist/ssr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActionItem } from "@/lib/supabase/types";
import { formatDueDate } from "@/lib/meetings/types";
import { cn } from "@/lib/utils";

export function AttentionCard({
  items,
  meetingTitleById,
}: {
  items: ActionItem[];
  meetingTitleById: Map<string, string>;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Warning size={18} className="text-amber-500" aria-hidden />
          <CardTitle>Precisa de atenção</CardTitle>
        </div>
        <CardDescription>Action items abertos, dos mais urgentes aos próximos.</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <CheckCircle size={28} className="text-emerald-500" aria-hidden />
            <p className="text-sm text-muted-foreground">
              Nada pendente. Você está em dia com seus action items.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => {
              const due = item.due_date ? formatDueDate(item.due_date) : null;
              const meetingTitle = meetingTitleById.get(item.meeting_id);
              return (
                <li key={item.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/reunioes/${item.meeting_id}`}
                      className="block truncate text-sm font-medium hover:underline"
                    >
                      {item.title}
                    </Link>
                    {meetingTitle && (
                      <p className="truncate text-xs text-muted-foreground">{meetingTitle}</p>
                    )}
                  </div>
                  {due && (
                    <span
                      className={cn(
                        "shrink-0 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium",
                        due.overdue
                          ? "bg-destructive/15 text-destructive"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {due.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
