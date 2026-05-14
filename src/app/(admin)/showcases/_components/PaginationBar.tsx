"use client";

import { Pagination } from "@/components/ui/pagination";

export function PaginationBar({
  page,
  totalPages,
  total,
  isFetching,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  isFetching: boolean;
  onPageChange: (next: number) => void;
}) {
  return (
    <div className="flex flex-col items-start justify-between gap-3 border-t border-border/60 px-5 py-3 text-[12.5px] text-muted-foreground sm:flex-row sm:items-center">
      <span>
        Page{" "}
        <strong className="font-semibold text-foreground">{page}</strong> of{" "}
        <strong className="font-semibold text-foreground">{totalPages}</strong>{" "}
        ·{" "}
        <strong className="font-semibold text-foreground">
          {total.toLocaleString("en-US")}
        </strong>{" "}
        items
      </span>
      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
        disabled={isFetching}
      />
    </div>
  );
}
