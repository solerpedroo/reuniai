import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ReviewBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "shrink-0 border-brand/30 bg-brand/10 text-[11px] font-medium text-brand",
        className
      )}
    >
      Revisar
    </Badge>
  );
}
