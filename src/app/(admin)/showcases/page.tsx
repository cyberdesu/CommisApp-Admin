"use client";

import { useState } from "react";

import { HeroBanner } from "./_components/HeroBanner";
import { ShowcaseDetailDialog } from "./_components/ShowcaseDetailDialog";
import { ShowcasesTable } from "./_components/ShowcasesTable";
import {
  useShowcaseDetail,
  useShowcasesList,
} from "./_hooks/useShowcasesData";

export default function ShowcasesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([]);
  const [detailId, setDetailId] = useState<string | null>(null);

  const showcasesQuery = useShowcasesList({ cursor, search });
  const detailQuery = useShowcaseDetail(detailId);

  const showcases = showcasesQuery.data?.data ?? [];
  const meta = showcasesQuery.data?.meta;
  const hasNextPage = meta?.hasNextPage ?? false;
  const nextCursor = meta?.nextCursor ?? null;

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCursor(null);
    setCursorHistory([]);
    setSearch(searchInput.trim());
  }

  function handlePrev() {
    if (cursorHistory.length === 0) return;
    const nextHistory = [...cursorHistory];
    const previousCursor = nextHistory.pop() ?? null;
    setCursorHistory(nextHistory);
    setCursor(previousCursor);
  }

  function handleNext(next: string) {
    setCursorHistory((current) => [...current, cursor]);
    setCursor(next);
  }

  return (
    <div className="space-y-6">
      <HeroBanner loadedCount={showcases.length} />

      <ShowcasesTable
        showcases={showcases}
        isLoading={showcasesQuery.isLoading}
        isFetching={showcasesQuery.isFetching}
        hasHistory={cursorHistory.length > 0}
        hasNextPage={hasNextPage}
        nextCursor={nextCursor}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSearchSubmit={handleSearchSubmit}
        onPrev={handlePrev}
        onNext={handleNext}
        onViewDetail={setDetailId}
      />

      <ShowcaseDetailDialog
        detailId={detailId}
        detail={detailQuery.data}
        isLoading={detailQuery.isLoading}
        onClose={() => setDetailId(null)}
      />
    </div>
  );
}
