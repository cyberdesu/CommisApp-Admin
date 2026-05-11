"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  AdminOrderStatus,
  UserOrderOverview,
} from "@/lib/user-orders.types";

import { AnalyticsSection } from "./_components/AnalyticsSection";
import { HeroBanner } from "./_components/HeroBanner";
import { OrderReviewDialog } from "./_components/OrderReviewDialog";
import { OrdersTable } from "./_components/OrdersTable";
import { OrdersToolbar } from "./_components/OrdersToolbar";
import {
  useOrderIntervention,
  useOrdersAnalytics,
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
  const analyticsQuery = useOrdersAnalytics(scopedUserId);

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

  return (
    <div className="space-y-6">
      <HeroBanner
        stats={statsQuery.data}
        scopedUserId={scopedUserId}
        onClearScope={() => router.replace("/orders")}
      />

      <AnalyticsSection analytics={analyticsQuery.data} />

      <Card className="rounded-3xl border border-zinc-200/80 bg-white shadow-sm">
        <CardHeader className="flex flex-col gap-4 border-b border-zinc-100 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-xl font-bold text-zinc-900">
              Orders Registry
            </CardTitle>
            <CardDescription className="text-sm text-zinc-500">
              Filter by workflow stage, source, and risky revision behavior.
            </CardDescription>
          </div>

          <OrdersToolbar
            searchInput={searchInput}
            onSearchInputChange={setSearchInput}
            onSearchSubmit={submitSearch}
            status={status}
            onStatusChange={changeFilter(setStatus)}
            source={source}
            onSourceChange={changeFilter(setSource)}
            attention={attention}
            onAttentionChange={changeFilter(setAttention)}
          />
        </CardHeader>

        <CardContent className="p-0">
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
        </CardContent>
      </Card>

      <OrderReviewDialog
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
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
