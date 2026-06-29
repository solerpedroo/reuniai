import { Skeleton } from "@/components/ui/skeleton";

export function MeetingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-border/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>

      <div className="surface-toolbar space-y-3 p-3">
        <Skeleton className="h-9 w-full" />
        <div className="flex gap-3">
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-9 w-44" />
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border/60 px-3 py-3 last:border-0"
          >
            <Skeleton className="h-4 flex-1 max-w-[28ch]" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="hidden h-5 w-20 rounded-md sm:block" />
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
