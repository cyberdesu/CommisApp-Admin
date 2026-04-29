"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Lock,
  MessageSquare,
  Send,
  ShieldAlert,
  User2,
} from "lucide-react";

import { apiClient } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type TicketAttachment = {
  id: string;
  fileKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  fileUrl: string | null;
  createdAt: string;
};

type TicketMessage = {
  id: string;
  senderRole: "USER" | "ADMIN";
  senderUserId: number | null;
  senderAdminId: number | null;
  body: string;
  internalNote: boolean;
  createdAt: string;
  senderUser:
    | {
        id: number;
        username: string;
        name: string | null;
        avatar: string | null;
      }
    | null;
  senderAdmin: { id: number; name: string } | null;
  attachments: TicketAttachment[];
};

type TicketDetail = {
  id: string;
  type: "SUPPORT" | "USER_REPORT" | "CONTENT_REPORT" | "ORDER_DISPUTE";
  subject: string;
  description: string;
  status:
    | "OPEN"
    | "IN_PROGRESS"
    | "AWAITING_USER"
    | "RESOLVED"
    | "CLOSED";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  category: string | null;
  reporterId: number;
  assignedAdminId: number | null;
  reportedUserId: number | null;
  orderId: string | null;
  showcaseItemId: string | null;
  resolutionNote: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  lastReplyAt: string | null;
  createdAt: string;
  updatedAt: string;
  reporter: {
    id: number;
    username: string;
    name: string | null;
    email: string;
    avatar: string | null;
  };
  reportedUser:
    | {
        id: number;
        username: string;
        name: string | null;
        email: string;
        avatar: string | null;
      }
    | null;
  showcaseItem: { id: string; title: string } | null;
  assignedAdmin: { id: number; name: string; email: string } | null;
  messages: TicketMessage[];
};

const STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "AWAITING_USER",
  "RESOLVED",
  "CLOSED",
] as const;
const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const ticketId = params.id;
  const qc = useQueryClient();

  const [body, setBody] = useState("");
  const [internalNote, setInternalNote] = useState(false);

  const { data, isLoading } = useQuery<{ data: TicketDetail }>({
    queryKey: ["ticket", ticketId],
    queryFn: async () => {
      const res = await apiClient.get(`/tickets/${ticketId}`);
      return res.data;
    },
  });

  const ticket = data?.data;

  const reply = useMutation({
    mutationFn: async (input: { body: string; internalNote: boolean }) => {
      const res = await apiClient.post(`/tickets/${ticketId}/messages`, input);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Reply posted");
      setBody("");
      setInternalNote(false);
      qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message || "Failed to post reply";
      toast.error(msg);
    },
  });

  const patchTicket = useMutation({
    mutationFn: async (
      input: Partial<
        Pick<
          TicketDetail,
          "status" | "priority" | "assignedAdminId" | "resolutionNote"
        >
      >,
    ) => {
      const res = await apiClient.patch(`/tickets/${ticketId}`, input);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Ticket updated");
      qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message || "Failed to update ticket";
      toast.error(msg);
    },
  });

  if (isLoading || !ticket) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link
            href="/tickets"
            className="inline-flex items-center gap-1 hover:text-indigo-600"
          >
            <ArrowLeft className="size-4" /> All tickets
          </Link>
        </div>

        <Card className="border-black/10 bg-white shadow-none">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-xl font-semibold text-black">
                  {ticket.subject}
                </CardTitle>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <Badge variant="outline">{ticket.type}</Badge>
                  <Badge variant="outline">{ticket.status}</Badge>
                  <Badge variant="outline">{ticket.priority}</Badge>
                  {ticket.category && (
                    <Badge variant="outline">{ticket.category}</Badge>
                  )}
                  <span>Created {formatDate(ticket.createdAt)}</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-black/10 bg-slate-50 p-4 text-sm text-slate-700 whitespace-pre-wrap">
              {ticket.description}
            </div>
          </CardContent>
        </Card>

        <Card className="border-black/10 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MessageSquare className="size-4 text-indigo-600" /> Conversation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ticket.messages.length === 0 ? (
              <p className="text-sm text-slate-500">No replies yet.</p>
            ) : (
              ticket.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "rounded-lg border p-3",
                    msg.senderRole === "ADMIN"
                      ? "border-indigo-200 bg-indigo-50/40"
                      : "border-black/10 bg-white",
                    msg.internalNote
                      ? "border-amber-300 bg-amber-50"
                      : "",
                  )}
                >
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-2 font-medium text-slate-700">
                      {msg.senderRole === "ADMIN" ? (
                        <ShieldAlert className="size-3.5" />
                      ) : (
                        <User2 className="size-3.5" />
                      )}
                      {msg.senderRole === "ADMIN"
                        ? msg.senderAdmin?.name || "Admin"
                        : msg.senderUser?.name || msg.senderUser?.username || "User"}
                      {msg.internalNote && (
                        <Badge variant="outline" className="ml-1 text-[10px]">
                          <Lock className="size-3 mr-1" /> Internal
                        </Badge>
                      )}
                    </span>
                    <span>{formatDate(msg.createdAt)}</span>
                  </div>
                  <div className="mt-2 text-sm text-slate-800 whitespace-pre-wrap">
                    {msg.body}
                  </div>
                  {msg.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {msg.attachments.map((att) => (
                        <a
                          key={att.id}
                          href={att.fileUrl ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded border border-black/10 bg-white px-2 py-1 text-xs text-slate-600 hover:text-indigo-600"
                        >
                          📎 {att.fileName}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-black/10 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Reply</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your reply…"
              rows={5}
              maxLength={5000}
              className="w-full min-h-[120px] rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={internalNote}
                  onChange={(e) => setInternalNote(e.target.checked)}
                />
                Internal note (not visible to user)
              </label>
              <Button
                onClick={() =>
                  reply.mutate({ body: body.trim(), internalNote })
                }
                disabled={!body.trim() || reply.isPending}
              >
                <Send className="size-4 mr-1" />
                {reply.isPending ? "Sending…" : "Send reply"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="border-black/10 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Reporter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium text-slate-800">
              {ticket.reporter.name || ticket.reporter.username}
            </p>
            <p className="text-slate-500">{ticket.reporter.email}</p>
            <p className="text-slate-400 text-xs">@{ticket.reporter.username}</p>
          </CardContent>
        </Card>

        <Card className="border-black/10 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select
                value={ticket.status}
                onValueChange={(v) =>
                  patchTicket.mutate({
                    status: v as TicketDetail["status"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Priority</Label>
              <Select
                value={ticket.priority}
                onValueChange={(v) =>
                  patchTicket.mutate({
                    priority: v as TicketDetail["priority"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {(ticket.reportedUser || ticket.orderId || ticket.showcaseItem) && (
          <Card className="border-black/10 bg-white shadow-none">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {ticket.reportedUser && (
                <div>
                  <p className="text-xs text-slate-500">Reported user</p>
                  <Link
                    href={`/users?search=${ticket.reportedUser.username}`}
                    className="font-medium text-indigo-600 hover:underline"
                  >
                    @{ticket.reportedUser.username}
                  </Link>
                </div>
              )}
              {ticket.orderId && (
                <div>
                  <p className="text-xs text-slate-500">Order</p>
                  <p className="font-mono text-xs text-slate-700">
                    {ticket.orderId}
                  </p>
                </div>
              )}
              {ticket.showcaseItem && (
                <div>
                  <p className="text-xs text-slate-500">Showcase item</p>
                  <Link
                    href={`/showcases?item=${ticket.showcaseItem.id}`}
                    className="font-medium text-indigo-600 hover:underline"
                  >
                    {ticket.showcaseItem.title}
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
