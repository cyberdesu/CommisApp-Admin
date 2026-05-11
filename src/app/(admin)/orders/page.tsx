"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Download } from "lucide-react";
import { toast } from "sonner";

import type {
  AdminOrderStatus,
  UserOrderOverview,
} from "@/lib/user-orders.types";

import { AttentionBanner } from "./_components/AttentionBanner";
import { KpiStrip } from "./_components/KpiStrip";
import { OrderReviewDialog } from "./_components/OrderReviewDialog";
import { OrdersTable } from "./_components/OrdersTable";
import { OrdersToolbar } from "./_components/OrdersToolbar";
import { StatusTabs } from "./_components/StatusTabs";
import {
  useOrderIntervention,
  useOrdersList,
  useOrdersRealtime,
  useOrdersStats,
} from "./_hooks/useOrdersData";
import type {
  AttentionFilter,
  SourceFilter,
  StatusFilter,
} from "./_lib/types";

export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const scopedUserId = useMemo(() => {
    const raw = searchParams.get("userId");
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [searchParams]);

  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [source, setSource] = useState<SourceFilter>("ALL");
  const [attention, setAttention] = useState<AttentionFilter>("ALL");

  const [selectedOrder, setSelectedOrder] = useState<UserOrderOverview | null>(
    null,
  );
  const [interventionStatus, setInterventionStatus] = useState<
    AdminOrderStatus | "UNCHANGED"
  >("UNCHANGED");
  const [interventionRevisionsUsed, setInterventionRevisionsUsed] =
    useState("");
  const [interventionNote, setInterventionNote] = useState("");

  const ordersQuery = useOrdersList({
    cursor,
    search,
    status,
    source,
    attention,
    scopedUserId,
  });
  const statsQuery = useOrdersStats();
  useOrdersRealtime();

  const interventionMutation = useOrderIntervention(() => {
    setSelectedOrder(null);
    setInterventionStatus("UNCHANGED");
    setInterventionRevisionsUsed("");
    setInterventionNote("");
  });

  const rows = ordersQuery.data?.data ?? [];
  const meta = ordersQuery.data?.meta;
  const hasNextPage = meta?.hasNextPage ?? false;
  const nextCursor = meta?.nextCursor ?? null;
  const stats = statsQuery.data;

  function resetPagination() {
    setCursor(null);
    setCursorHistory([]);
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetPagination();
    setSearch(searchInput.trim());
  }

  function openOrder(order: UserOrderOverview) {
    setSelectedOrder(order);
    setInterventionStatus("UNCHANGED");
    setInterventionRevisionsUsed(String(order.revisionsUsed));
    setInterventionNote("");
  }

  function closeOrder() {
    setSelectedOrder(null);
    setInterventionStatus("UNCHANGED");
    setInterventionRevisionsUsed("");
    setInterventionNote("");
  }

  function openOrderChat(conversationId: string) {
    router.push(`/chats?conversationId=${encodeURIComponent(conversationId)}`);
  }

  function submitIntervention() {
    if (!selectedOrder) return;

    const note = interventionNote.trim();
    const parsedRevisionsUsed = Number.parseInt(interventionRevisionsUsed, 10);
    const nextStatus =
      interventionStatus === "UNCHANGED" ? undefined : interventionStatus;
    const shouldChangeRevisions =
      interventionRevisionsUsed.trim() !== "" &&
      Number.isFinite(parsedRevisionsUsed) &&
      parsedRevisionsUsed !== selectedOrder.revisionsUsed;

    if (!note || note.length < 3) {
      toast.error("Please add a short admin note");
      return;
    }
    if (
      interventionRevisionsUsed.trim() !== "" &&
      (!Number.isFinite(parsedRevisionsUsed) || parsedRevisionsUsed < 0)
    ) {
      toast.error("Revision usage must be 0 or higher");
      return;
    }
    if (!nextStatus && !shouldChangeRevisions) {
      toast.error("No order change selected");
      return;
    }

    interventionMutation.mutate({
      id: selectedOrder.id,
      ...(nextStatus ? { status: nextStatus } : {}),
      ...(shouldChangeRevisions
        ? { revisionsUsed: parsedRevisionsUsed }
        : {}),
      note,
    });
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

  function changeFilter<T>(setter: (v: T) => void) {
    return (value: T) => {
      setter(value);
      resetPagination();
    };
  }

  const totalLabel = stats?.total?.toLocaleString("en-US") ?? "—";
  const attentionLabel = stats?.attention?.toLocaleString("en-US") ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Commission orders
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Monitor delivery progress dan intervene saat artist menahan
            delivery atau client over-revise. {totalLabel} total ·{" "}
            {attentionLabel} butuh perhatian.
          </p>
          {scopedUserId && (
            <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
              <span>Scoped to user #{scopedUserId}</span>
              <button
                type="button"
                onClick={() => router.replace("/orders")}
                className="font-semibold text-primary hover:underline"
              >
                Clear
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => toast.info("Export coming soon")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
          >
            <Download className="size-3.5" />
            Export
          </button>
          <button
            type="button"
            onClick={() => {
              setAttention("FLAGGED");
              resetPagination();
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:brightness-105"
          >
            <AlertTriangle className="size-3.5" />
            Review attention queue
          </button>
        </div>
      </div>

      <KpiStrip stats={stats} isLoading={statsQuery.isLoading} />

      {attention !== "FLAGGED" && (
        <AttentionBanner
          attentionCount={stats?.attention ?? 0}
          onViewAttention={() => {
            setAttention("FLAGGED");
            resetPagination();
          }}
        />
      )}

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-col gap-4 border-b border-border/60 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight">
              Orders registry
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Filter by workflow stage, source, dan risiko revision pressure.
            </p>
          </div>
          <OrdersToolbar
            searchInput={searchInput}
            onSearchInputChange={setSearchInput}
            onSearchSubmit={submitSearch}
            source={source}
            onSourceChange={changeFilter(setSource)}
            attention={attention}
            onAttentionChange={changeFilter(setAttention)}
          />
        </div>

        <StatusTabs
          status={status}
          onChange={changeFilter(setStatus)}
          stats={stats}
        />

        <OrdersTable
          rows={rows}
          isLoading={ordersQuery.isLoading}
          isFetching={ordersQuery.isFetching}
          hasHistory={cursorHistory.length > 0}
          hasNextPage={hasNextPage}
          nextCursor={nextCursor}
          onPrev={handlePrev}
          onNext={handleNext}
          onReview={openOrder}
          onOpenChat={openOrderChat}
        />
      </section>

      <OrderReviewDialog
        order={selectedOrder}
        onClose={closeOrder}
        interventionStatus={interventionStatus}
        setInterventionStatus={setInterventionStatus}
        interventionRevisionsUsed={interventionRevisionsUsed}
        setInterventionRevisionsUsed={setInterventionRevisionsUsed}
        interventionNote={interventionNote}
        setInterventionNote={setInterventionNote}
        isSubmitting={interventionMutation.isPending}
        onSubmit={submitIntervention}
        onOpenChat={openOrderChat}
      />
    </div>
  );
}
