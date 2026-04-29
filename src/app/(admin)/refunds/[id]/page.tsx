"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  RefreshCcw,
  ShieldAlert,
  Ticket,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type RefundStatus =
  | "REQUESTED"
  | "APPROVED_BY_ARTIST"
  | "DENIED_BY_ARTIST"
  | "ESCALATED"
  | "APPROVED_BY_ADMIN"
  | "DENIED_BY_ADMIN"
  | "REFUNDED"
  | "WITHDRAWN"
  | "FAILED";

type RefundDetail = {
  id: string;
  orderId: string;
  status: RefundStatus;
  amount: string | number;
  currency: string;
  reason: string;
  artistResponse: string | null;
  adminNote: string | null;
  ticketId: string | null;
  resolvedAt: string | null;
  resolvedById: number | null;
  resolvedByRole: "ARTIST" | "ADMIN" | "CLIENT" | "SYSTEM" | null;
  paypalRefundId: string | null;
  refundedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
  client: {
    id: number;
    username: string;
    name: string | null;
    email: string;
    avatar: string | null;
  };
  artist: {
    id: number;
    username: string;
    name: string | null;
    email: string;
    avatar: string | null;
  };
  payment: {
    id: string;
    paypalCaptureId: string | null;
    amount: string | number;
    currency: string;
    paidAt: string | null;
  };
  order: {
    id: string;
    titleSnapshot: string | null;
    status: string;
    priceSnapshot: string | number;
    currency: string;
    briefSnapshot: unknown;
    createdAt: string;
    updatedAt: string;
    artist: { id: number; username: string; name: string | null };
    client: { id: number; username: string; name: string | null };
    events: Array<{
      id: string;
      type: string;
      description: string;
      metadata: unknown;
      createdAt: string;
    }>;
  };
};

const STATUS_LABEL: Record<RefundStatus, string> = {
  REQUESTED: "Requested",
  APPROVED_BY_ARTIST: "Approved by artist",
  DENIED_BY_ARTIST: "Denied by artist",
  ESCALATED: "Escalated",
  APPROVED_BY_ADMIN: "Approved by admin",
  DENIED_BY_ADMIN: "Denied by admin",
  REFUNDED: "Refunded",
  WITHDRAWN: "Withdrawn",
  FAILED: "Failed",
};

const STATUS_BADGE: Record<RefundStatus, string> = {
  REQUESTED: "border-amber-500/20 bg-amber-500/10 text-amber-700",
  APPROVED_BY_ARTIST: "border-blue-500/20 bg-blue-500/10 text-blue-700",
  DENIED_BY_ARTIST: "border-rose-500/20 bg-rose-500/10 text-rose-700",
  ESCALATED: "border-orange-500/20 bg-orange-500/10 text-orange-700",
  APPROVED_BY_ADMIN: "border-blue-500/20 bg-blue-500/10 text-blue-700",
  DENIED_BY_ADMIN: "border-slate-400/20 bg-slate-400/10 text-slate-700",
  REFUNDED: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
  WITHDRAWN: "border-slate-400/20 bg-slate-400/10 text-slate-600",
  FAILED: "border-red-500/30 bg-red-500/15 text-red-700",
};

const ADMIN_DECIDABLE_FROM: RefundStatus[] = [
  "REQUESTED",
  "ESCALATED",
  "FAILED",
  "APPROVED_BY_ARTIST",
  "APPROVED_BY_ADMIN",
];

const NOTE_MIN = 5;
const NOTE_MAX = 2000;

function formatMoney(value: string | number, currency: string) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return `${currency} ${value}`;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(numeric);
  } catch {
    return `${currency} ${numeric.toFixed(2)}`;
  }
}

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function RefundDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const refundId = params?.id;
  const queryClient = useQueryClient();

  const [adminNote, setAdminNote] = useState("");
  const [pendingDecision, setPendingDecision] = useState<
    "approve" | "deny" | null
  >(null);

  const { data, isLoading, isError, refetch, isFetching } =
    useQuery<{ data: RefundDetail }>({
      queryKey: ["refund-detail", refundId],
      enabled: Boolean(refundId),
      queryFn: async () => {
        const res = await apiClient.get<{ data: RefundDetail }>(
          `/refunds/${refundId}`,
        );
        return res.data;
      },
    });

  const refund = data?.data;
  const canDecide = useMemo(() => {
    if (!refund) return false;
    return ADMIN_DECIDABLE_FROM.includes(refund.status);
  }, [refund]);

  const decisionMutation = useMutation({
    mutationFn: async (payload: {
      approve: boolean;
      adminNote: string;
      ticketId?: string | null;
    }) => {
      const res = await apiClient.post(
        `/refunds/${refundId}/decide`,
        {
          approve: payload.approve,
          adminNote: payload.adminNote,
          ticketId: payload.ticketId ?? undefined,
        },
      );
      return res.data;
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.approve
          ? "Refund approved. PayPal refund triggered."
          : "Refund denied.",
      );
      void queryClient.invalidateQueries({
        queryKey: ["refund-detail", refundId],
      });
      void queryClient.invalidateQueries({ queryKey: ["refunds"] });
      setAdminNote("");
      setPendingDecision(null);
    },
    onError: (error: unknown) => {
      const message =
        error &&
        typeof error === "object" &&
        "response" in error &&
        error.response &&
        typeof error.response === "object" &&
        "data" in error.response &&
        error.response.data &&
        typeof error.response.data === "object" &&
        "message" in error.response.data
          ? String((error.response.data as { message?: unknown }).message)
          : "Failed to apply refund decision.";
      toast.error(message);
      setPendingDecision(null);
    },
  });

  const handleDecide = (approve: boolean) => {
    const trimmed = adminNote.trim();
    if (trimmed.length < NOTE_MIN) {
      toast.error(`Admin note must be at least ${NOTE_MIN} characters.`);
      return;
    }
    if (trimmed.length > NOTE_MAX) {
      toast.error(`Admin note must be no more than ${NOTE_MAX} characters.`);
      return;
    }
    if (approve) {
      const ok = window.confirm(
        "Approve this refund? PayPal will be charged immediately and this cannot be undone.",
      );
      if (!ok) return;
    }
    setPendingDecision(approve ? "approve" : "deny");
    decisionMutation.mutate({
      approve,
      adminNote: trimmed,
      ticketId: refund?.ticketId ?? null,
    });
  };

  if (!refundId) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-slate-500">Invalid refund id.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isError || !refund) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        <Card>
          <CardContent className="flex items-center gap-3 p-6 text-sm text-red-700">
            <AlertCircle className="size-5" />
            Failed to load refund detail.
          </CardContent>
        </Card>
      </div>
    );
  }

  const isBusy = decisionMutation.isPending || isFetching;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="size-4" /> Back to refunds
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isBusy}
        >
          <RefreshCcw className="size-4" /> Refresh
        </Button>
      </div>

      <Card className="border-black/10 bg-white shadow-none">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-semibold text-black">
                {refund.order.titleSnapshot ?? "Untitled order"}
              </CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Refund #{refund.id.slice(0, 8)} • Order #
                {refund.orderId.slice(0, 8)} • Created{" "}
                {formatDate(refund.createdAt)}
              </p>
            </div>
            <Badge className={cn("border", STATUS_BADGE[refund.status])}>
              {STATUS_LABEL[refund.status]}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-black/10 p-4">
              <p className="text-xs font-medium text-slate-500">Amount</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {formatMoney(refund.amount, refund.currency)}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Order total: {formatMoney(refund.order.priceSnapshot, refund.order.currency)}
              </p>
            </div>
            <div className="rounded-xl border border-black/10 p-4">
              <p className="text-xs font-medium text-slate-500">Client</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {refund.client.name || refund.client.username}
              </p>
              <p className="text-xs text-slate-500">{refund.client.email}</p>
            </div>
            <div className="rounded-xl border border-black/10 p-4">
              <p className="text-xs font-medium text-slate-500">Artist</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {refund.artist.name || refund.artist.username}
              </p>
              <p className="text-xs text-slate-500">{refund.artist.email}</p>
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Client reason
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words rounded-xl border border-black/10 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {refund.reason}
              </p>
            </div>

            {refund.artistResponse ? (
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Artist response
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words rounded-xl border border-black/10 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {refund.artistResponse}
                </p>
              </div>
            ) : null}

            {refund.adminNote ? (
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Admin note
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words rounded-xl border border-black/10 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {refund.adminNote}
                </p>
              </div>
            ) : null}

            {refund.failureReason ? (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <ShieldAlert className="size-4" />
                <span>PayPal failure: {refund.failureReason}</span>
              </div>
            ) : null}

            {refund.paypalRefundId ? (
              <p className="text-xs text-emerald-700">
                PayPal refund id: {refund.paypalRefundId}
              </p>
            ) : null}
          </section>

          {refund.ticketId ? (
            <Link
              href={`/tickets/${refund.ticketId}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-orange-600 hover:underline"
            >
              <Ticket className="size-4" />
              View linked dispute ticket
            </Link>
          ) : null}

          {canDecide ? (
            <section className="space-y-3 rounded-xl border border-black/10 bg-slate-50/60 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Admin decision
                </p>
                <p className="text-xs text-slate-500">
                  Note will be stored on the refund record and sent to client and
                  artist. Approve triggers a PayPal refund immediately.
                </p>
              </div>
              <textarea
                rows={4}
                placeholder="Why are you approving / denying? (min 5 chars)"
                value={adminNote}
                onChange={(e) =>
                  setAdminNote(e.target.value.slice(0, NOTE_MAX))
                }
                disabled={decisionMutation.isPending}
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  {adminNote.trim().length} / {NOTE_MAX} • min {NOTE_MIN}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDecide(false)}
                    disabled={decisionMutation.isPending}
                  >
                    {pendingDecision === "deny" &&
                    decisionMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <XCircle className="size-4" />
                    )}
                    Deny refund
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleDecide(true)}
                    disabled={decisionMutation.isPending}
                    className="bg-orange-500 text-white hover:bg-orange-600"
                  >
                    {pendingDecision === "approve" &&
                    decisionMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-4" />
                    )}
                    Approve &amp; refund
                  </Button>
                </div>
              </div>
            </section>
          ) : (
            <p className="rounded-xl border border-black/10 bg-slate-50/60 p-4 text-sm text-slate-600">
              This refund is in a terminal state ({STATUS_LABEL[refund.status]})
              and cannot be modified.
            </p>
          )}

          <section>
            <p className="text-xs font-semibold uppercase text-slate-500">
              Order activity
            </p>
            <ul className="mt-2 space-y-2 text-sm">
              {refund.order.events.length === 0 ? (
                <li className="text-xs text-slate-500">No events.</li>
              ) : (
                refund.order.events.map((event) => (
                  <li
                    key={event.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 bg-white px-3 py-2"
                  >
                    <span className="text-slate-700">
                      <span className="font-medium">{event.type}</span> —{" "}
                      {event.description}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDate(event.createdAt)}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
