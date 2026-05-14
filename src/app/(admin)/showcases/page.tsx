"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { DeleteShowcaseModal } from "./_components/DeleteShowcaseModal";
import {
  ModerationModal,
  type ModerationAction,
} from "./_components/ModerationModal";
import { PageHead } from "./_components/PageHead";
import { PaginationBar } from "./_components/PaginationBar";
import { ShowcaseDetailDrawer } from "./_components/ShowcaseDetailDrawer";
import { ShowcaseGallery } from "./_components/ShowcaseGallery";
import { ShowcaseTabs } from "./_components/ShowcaseTabs";
import { ShowcaseToolbar } from "./_components/ShowcaseToolbar";
import { ShowcasesTable } from "./_components/ShowcasesTable";
import { ShowcasesTableSkeleton } from "./_components/ShowcasesTableSkeleton";
import {
  useShowcaseDetail,
  useShowcasesList,
} from "./_hooks/useShowcasesData";
import { detailToItem } from "./_lib/helpers";
import type {
  ShowcaseItem,
  ShowcaseTab,
  ShowcaseView,
} from "./_lib/types";

export default function ShowcasesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<ShowcaseTab>("ALL");
  const [view, setView] = useState<ShowcaseView>("GRID");

  const [detailId, setDetailId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [moderationTarget, setModerationTarget] =
    useState<ShowcaseItem | null>(null);
  const [moderationAction, setModerationAction] =
    useState<ModerationAction>("MATURE");
  const [moderationReason, setModerationReason] = useState("");
  const [moderationPending, setModerationPending] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ShowcaseItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletePending, setDeletePending] = useState(false);

  const showcasesQuery = useShowcasesList({ page, search, tab });
  const detailQuery = useShowcaseDetail(detailId);

  const showcases = useMemo(
    () => showcasesQuery.data?.data ?? [],
    [showcasesQuery.data?.data],
  );
  const meta = showcasesQuery.data?.meta;
  const stats = showcasesQuery.data?.stats;

  useEffect(() => {
    if (!meta) return;
    if (meta.page !== page) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPage(meta.page);
    }
  }, [meta, page]);

  function resetPagination() {
    setPage(1);
  }

  function changeTab(next: ShowcaseTab) {
    setTab(next);
    resetPagination();
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetPagination();
    setSearch(searchInput.trim());
  }

  function openDetail(id: string) {
    setDetailId(id);
    setDrawerOpen(true);
  }

  function openModerate(item: ShowcaseItem) {
    setModerationTarget(item);
    setModerationAction("MATURE");
    setModerationReason("");
  }

  function openDelete(item: ShowcaseItem) {
    setDeleteTarget(item);
    setDeleteConfirm("");
  }

  function submitModeration() {
    if (!moderationTarget) return;
    if (moderationReason.trim().length < 3) {
      toast.error("Please add a short admin note");
      return;
    }
    setModerationPending(true);
    // Backend endpoint not implemented yet
    setTimeout(() => {
      setModerationPending(false);
      toast.info("Moderation action recorded (backend pending)");
      setModerationTarget(null);
      setModerationReason("");
    }, 400);
  }

  function submitDelete() {
    if (!deleteTarget) return;
    setDeletePending(true);
    setTimeout(() => {
      setDeletePending(false);
      toast.info("Delete action recorded (backend pending)");
      setDeleteTarget(null);
      setDeleteConfirm("");
    }, 400);
  }

  return (
    <div className="space-y-6">
      <PageHead />

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-col gap-4 border-b border-border/60 px-5 py-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-semibold tracking-tight">
                Showcase directory
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Filter by status, verifikasi, atau content flag.
              </p>
            </div>
            <ShowcaseToolbar
              searchInput={searchInput}
              onSearchInputChange={setSearchInput}
              onSearchSubmit={handleSearchSubmit}
              view={view}
              onViewChange={setView}
            />
          </div>
          <ShowcaseTabs tab={tab} onChange={changeTab} stats={stats} />
        </div>

        {showcasesQuery.isLoading ? (
          <div className="p-5">
            <ShowcasesTableSkeleton />
          </div>
        ) : view === "GRID" ? (
          <ShowcaseGallery
            items={showcases}
            onView={openDetail}
            onModerate={openModerate}
            onDelete={openDelete}
          />
        ) : (
          <ShowcasesTable
            items={showcases}
            onView={openDetail}
            onModerate={openModerate}
            onDelete={openDelete}
          />
        )}

        <PaginationBar
          page={meta?.page ?? page}
          totalPages={meta?.totalPages ?? 1}
          total={meta?.total ?? 0}
          isFetching={showcasesQuery.isFetching}
          onPageChange={setPage}
        />
      </section>

      <ShowcaseDetailDrawer
        open={drawerOpen}
        onOpenChange={(o) => {
          setDrawerOpen(o);
          if (!o) setDetailId(null);
        }}
        detail={detailQuery.data}
        isLoading={detailQuery.isLoading}
        onModerate={() => {
          if (detailQuery.data) openModerate(detailToItem(detailQuery.data));
        }}
        onDelete={() => {
          if (detailQuery.data) openDelete(detailToItem(detailQuery.data));
        }}
      />

      <ModerationModal
        open={Boolean(moderationTarget)}
        onOpenChange={(o) => {
          if (!o) {
            setModerationTarget(null);
            setModerationReason("");
          }
        }}
        targetTitle={moderationTarget?.title ?? null}
        action={moderationAction}
        setAction={setModerationAction}
        reason={moderationReason}
        setReason={setModerationReason}
        onSubmit={submitModeration}
        isSubmitting={moderationPending}
      />

      <DeleteShowcaseModal
        target={deleteTarget}
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteTarget(null);
            setDeleteConfirm("");
          }
        }}
        confirmInput={deleteConfirm}
        onConfirmInputChange={setDeleteConfirm}
        onSubmit={submitDelete}
        isSubmitting={deletePending}
      />
    </div>
  );
}
