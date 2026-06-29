import { Skeleton } from "@/components/ui/skeleton";

export function MeetingDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-36" />

      <div className="flex flex-col gap-4 border-b border-border/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-full max-w-md" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>

      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-14 w-full rounded-lg" />

      <div className="flex gap-1 border-b border-border/80 pb-px">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-t-md" />
        ))}
      </div>

      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  );
}
