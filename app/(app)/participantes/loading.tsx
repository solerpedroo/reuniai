import { Skeleton } from "@/components/ui/skeleton";

export default function ParticipantsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-[220px]" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
