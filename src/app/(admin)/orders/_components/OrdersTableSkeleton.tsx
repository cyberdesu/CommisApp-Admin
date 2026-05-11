import { Skeleton } from "@/components/ui/skeleton";

export function OrdersTableSkeleton() {
  return (
    <div className="space-y-2 p-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 rounded-2xl border border-zinc-100 px-5 py-4"
        >
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-48 rounded-full" />
            <Skeleton className="h-3 w-72 rounded-full" />
          </div>
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-xl" />
        </div>
      ))}
    </div>
  );
}
