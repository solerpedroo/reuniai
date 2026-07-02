import { Skeleton } from "@/components/ui/skeleton";

export default function AssistenteLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <Skeleton className="h-[420px] w-full rounded-xl" />
    </div>
  );
}
