import { Skeleton } from "@/components/ui/skeleton";

export function ShowcasesTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 rounded-2xl border border-border p-4"
        >
          <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3 rounded" />
            <Skeleton className="h-3 w-1/4 rounded" />
          </div>
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-8 shrink-0 rounded-xl" />
        </div>
      ))}
    </div>
  );
}
