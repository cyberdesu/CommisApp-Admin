"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  MoreHorizontal,
  Pencil,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  UserRound,
  Users,
  X,
  XCircle,
} from "lucide-react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { apiClient } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── Types ───────────────────────────────────────────────────────────────────

type UserItem = {
  id: number;
  email: string;
  name: string | null;
  username: string;
  role: string;
  verified: boolean;
  verifiedArtists: boolean;
  createdAt: string;
  avatar?: string | null;
  banner?: string | null;
  bio?: string | null;
  country?: string | null;
};

type UsersResponse = {
  data: UserItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

type UserDetailResponse = {
  data: UserItem;
};

type UpdateUserPayload = {
  name: string;
  username: string;
  email: string;
  role: string;
  verified: boolean;
  verifiedArtists: boolean;
  country: string;
  bio: string;
};

const PAGE_SIZE = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveMediaUrl(path?: string | null): string | null {
  if (!path) return null;
  return path;
}

function getRoleConfig(role: string): {
  className: string;
  dot: string;
} {
  const value = role.toLowerCase();
  if (value.includes("admin")) {
    return {
      className: "bg-slate-900 text-white border-slate-800",
      dot: "bg-white",
    };
  }
  if (value.includes("artist")) {
    return {
      className: "bg-violet-600 text-white border-violet-700",
      dot: "bg-violet-200",
    };
  }
  if (value.includes("manager")) {
    return {
      className: "bg-amber-500 text-white border-amber-600",
      dot: "bg-amber-200",
    };
  }
  return {
    className: "bg-zinc-100 text-zinc-700 border-zinc-200",
    dot: "bg-zinc-400",
  };
}

function formatDate(dateStr: string, withTime = false) {
  return new Date(dateStr).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function UserAvatar({
  user,
  className,
  size = "md",
}: {
  user: Pick<UserItem, "avatar" | "name" | "username">;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const avatarUrl = resolveMediaUrl(user.avatar);
  const fallback = (
    user.name?.trim()?.[0] ||
    user.username?.trim()?.[0] ||
    "U"
  ).toUpperCase();

  const sizeClass = {
    sm: "size-8 text-xs rounded-xl",
    md: "size-10 text-sm rounded-2xl",
    lg: "size-16 text-lg rounded-3xl",
  }[size];

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={user.name ?? user.username}
        className={cn(
          "border border-black/10 object-cover",
          sizeClass,
          className,
        )}
      />
    );
  }

  // Generate a deterministic gradient from username
  const colors = [
    "from-violet-500 to-indigo-600",
    "from-rose-500 to-pink-600",
    "from-amber-500 to-orange-600",
    "from-emerald-500 to-teal-600",
    "from-cyan-500 to-blue-600",
    "from-fuchsia-500 to-purple-600",
  ];
  const colorIdx =
    (user.username?.charCodeAt(0) ?? 0) % colors.length;

  return (
    <div
      className={cn(
        "flex items-center justify-center bg-gradient-to-br font-bold text-white",
        colors[colorIdx],
        sizeClass,
        className,
      )}
    >
      {fallback}
    </div>
  );
}

// ─── Stats Cards (computed from server-side total + current page slice) ───────
// NOTE: verified/artist/admin counts are from the current page only.
// For accurate global counts the API would need to return aggregates.
// We display a "~" prefix when the total exceeds PAGE_SIZE to communicate this.

interface StatItem {
  label: string;
  value: string;
  detail: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  approximate: boolean;
}

function StatsCards({ users, total }: { users: UserItem[]; total: number }) {
  const isPartial = total > users.length;

  const stats: StatItem[] = useMemo(() => {
    const verifiedCount = users.filter((u) => u.verified).length;
    const verifiedArtistCount = users.filter((u) => u.verifiedArtists).length;
    const adminCount = users.filter((u) =>
      u.role.toLowerCase().includes("admin"),
    ).length;

    return [
      {
        label: "Total Users",
        value: total.toLocaleString("id-ID"),
        detail: "All registered accounts",
        icon: Users,
        color: "text-indigo-600",
        bgColor: "bg-indigo-50",
        approximate: false,
      },
      {
        label: "Verified",
        value: verifiedCount.toLocaleString("id-ID"),
        detail: isPartial ? "On this page only" : "Email verified",
        icon: CheckCircle2,
        color: "text-emerald-600",
        bgColor: "bg-emerald-50",
        approximate: isPartial,
      },
      {
        label: "Verified Artists",
        value: verifiedArtistCount.toLocaleString("id-ID"),
        detail: isPartial ? "On this page only" : "Verified artists",
        icon: Star,
        color: "text-violet-600",
        bgColor: "bg-violet-50",
        approximate: isPartial,
      },
      {
        label: "Admin Role",
        value: adminCount.toLocaleString("id-ID"),
        detail: isPartial ? "On this page only" : "Admin panel access",
        icon: ShieldCheck,
        color: "text-amber-600",
        bgColor: "bg-amber-50",
        approximate: isPartial,
      },
    ];
  }, [total, users, isPartial]);

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ label, value, detail, icon: Icon, color, bgColor, approximate }) => (
        <Card
          key={label}
          className="group relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/10"
        >
          {/* subtle gradient overlay on hover */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white via-white to-indigo-50/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          <CardHeader className="relative flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardDescription className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-400">
                {label}
              </CardDescription>
              <CardTitle className="flex items-baseline gap-1 text-3xl font-bold tracking-tight text-slate-900">
                {approximate && (
                  <span className="text-base font-semibold text-zinc-400">~</span>
                )}
                {value}
              </CardTitle>
            </div>
            <div
              className={cn(
                "flex size-11 items-center justify-center rounded-2xl",
                bgColor,
                color,
              )}
            >
              <Icon className="size-5" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-xs text-zinc-500">{detail}</p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function UsersTableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-2xl border border-zinc-100 px-5 py-4"
        >
          <Skeleton className="size-10 shrink-0 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-36 rounded-full" />
            <Skeleton className="h-3 w-52 rounded-full" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-4 w-20 rounded-full" />
          <Skeleton className="size-8 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const queryClient = useQueryClient();

  // Search: debounced via form submit
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState("all");
  const [verifiedFilter, setVerifiedFilter] = useState("all");

  // Dialogs
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);

  const [form, setForm] = useState<UpdateUserPayload>({
    name: "",
    username: "",
    email: "",
    role: "user",
    verified: false,
    verifiedArtists: false,
    country: "",
    bio: "",
  });

  // ── Queries ────────────────────────────────────────────────────────────────

  const usersQuery = useQuery({
    queryKey: ["users", { page, search, roleFilter, verifiedFilter }],
    queryFn: async () => {
      const response = await apiClient.get<UsersResponse>("/users", {
        params: {
          page,
          limit: PAGE_SIZE,
          search,
          ...(roleFilter !== "all" ? { role: roleFilter } : {}),
          ...(verifiedFilter !== "all" ? { verified: verifiedFilter } : {}),
        },
      });
      return response.data;
    },
    placeholderData: keepPreviousData,
  });

  const detailQuery = useQuery({
    queryKey: ["user-detail", selectedUserId],
    queryFn: async () => {
      const response = await apiClient.get<UserDetailResponse>(
        `/users/${selectedUserId}`,
      );
      return response.data.data;
    },
    enabled: selectedUserId !== null && (editOpen || viewOpen),
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: number; data: UpdateUserPayload }) => {
      const response = await apiClient.patch(
        `/users/${payload.id}`,
        payload.data,
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("User updated successfully");
      setEditOpen(false);
      setSelectedUserId(null);
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      void queryClient.invalidateQueries({ queryKey: ["user-detail"] });
    },
    onError: () => {
      toast.error("Failed to update user. Please try again.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.delete(`/users/${id}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success("User deleted successfully");
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: () => {
      toast.error("Failed to delete user. Please try again.");
    },
  });

  const quickToggleMutation = useMutation({
    mutationFn: async (user: UserItem) => {
      const response = await apiClient.patch(`/users/${user.id}`, {
        verified: !user.verified,
      });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      toast.success(
        variables.verified
          ? "Verification revoked"
          : "User verified successfully",
      );
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: () => {
      toast.error("Failed to update verification status");
    },
  });

  // ── Derived state ──────────────────────────────────────────────────────────

  const users = usersQuery.data?.data ?? [];
  const meta = usersQuery.data?.meta;
  const total = meta?.total ?? 0;
  const totalPages = Math.max(meta?.totalPages ?? 1, 1);
  const activeDetail = detailQuery.data;

  const hasActiveFilters =
    search !== "" || roleFilter !== "all" || verifiedFilter !== "all";

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function handleClearSearch() {
    setSearchInput("");
    setSearch("");
    setPage(1);
  }

  function handleOpenEdit(user: UserItem) {
    setSelectedUserId(user.id);
    setForm({
      name: user.name ?? "",
      username: user.username,
      email: user.email,
      role: user.role,
      verified: user.verified,
      verifiedArtists: user.verifiedArtists,
      country: user.country ?? "",
      bio: user.bio ?? "",
    });
    setEditOpen(true);
  }

  function handleOpenView(user: UserItem) {
    setSelectedUserId(user.id);
    setViewOpen(true);
  }

  function handleDetailSync() {
    const user = detailQuery.data;
    if (!user) return;
    setForm({
      name: user.name ?? "",
      username: user.username,
      email: user.email,
      role: user.role,
      verified: user.verified,
      verifiedArtists: user.verifiedArtists,
      country: user.country ?? "",
      bio: user.bio ?? "",
    });
  }

  function patchForm<K extends keyof UpdateUserPayload>(
    key: K,
    value: UpdateUserPayload[K],
  ) {
    setForm((cur) => ({ ...cur, [key]: value }));
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Hero Banner ─────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-8 text-white shadow-lg">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 right-1/3 size-48 rounded-full bg-violet-500/15 blur-2xl" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-300">
              <Sparkles className="size-3.5" />
              User Management
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Manage Users
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-slate-400 md:text-base">
              Search, filter, edit, and manage registered user accounts directly from the admin panel.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {[
              { label: "Database", value: "Prisma + Supabase" },
              { label: "Storage", value: "MinIO Store" },
              { label: "Status", value: "Live Data" },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm"
              >
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  {label}
                </p>
                <p className="mt-1 text-sm font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────── */}
      <StatsCards users={users} total={total} />

      {/* ── Table Card ─────────────────────────────────── */}
      <Card className="rounded-3xl border border-zinc-200/80 bg-white shadow-sm">
        <CardHeader className="flex flex-col gap-4 border-b border-zinc-100 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-xl font-bold text-zinc-900">
              Daftar Users
            </CardTitle>
            <CardDescription className="text-sm text-zinc-500">
              {total > 0 ? (
                <>
                  <span className="font-semibold text-zinc-700">{total.toLocaleString("en-US")}</span>{" "}
                  registered users
                  {hasActiveFilters && " · filters active"}
                </>
              ) : (
                "Search, filter, and manage registered user accounts."
              )}
            </CardDescription>
          </div>

          {/* Controls */}
          <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="flex w-full gap-2 lg:w-72">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search name, username, email..."
                  className="h-10 rounded-xl border-zinc-200 bg-zinc-50 pl-9 pr-8 text-sm placeholder:text-zinc-400 focus-visible:border-indigo-400 focus-visible:ring-indigo-500/20 focus-visible:bg-white"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
              <Button
                type="submit"
                className="h-10 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Search
              </Button>
            </form>

            {/* Filters */}
            <div className="flex gap-2">
              <Select
                value={roleFilter}
                onValueChange={(val) => {
                  setRoleFilter(val || "all");
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-[130px] rounded-xl border-zinc-200 bg-zinc-50 text-sm focus:ring-indigo-500/20">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-zinc-200 bg-white">
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="artist">Artist</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={verifiedFilter}
                onValueChange={(val) => {
                  setVerifiedFilter(val || "all");
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-[140px] rounded-xl border-zinc-200 bg-zinc-50 text-sm focus:ring-indigo-500/20">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-zinc-200 bg-white">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="true">Verified</SelectItem>
                  <SelectItem value="false">Unverified</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="outline"
                  className="h-10 rounded-xl border-zinc-200 bg-zinc-50 text-sm text-zinc-600 hover:bg-zinc-100"
                  onClick={() => {
                    setSearchInput("");
                    setSearch("");
                    setRoleFilter("all");
                    setVerifiedFilter("all");
                    setPage(1);
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          {usersQuery.isLoading ? (
            <UsersTableSkeleton />
          ) : users.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50/50 px-8 py-16 text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-white shadow-sm border border-zinc-200 text-zinc-400">
                <Users className="size-8" />
              </div>
              <h3 className="mt-5 text-base font-semibold text-zinc-900">
                No users found
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-zinc-500">
                {hasActiveFilters
                  ? "Try adjusting your search query or clearing the filters."
                  : "No users have been registered yet."}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  className="mt-5 rounded-xl border-zinc-200"
                  onClick={() => {
                    setSearchInput("");
                    setSearch("");
                    setRoleFilter("all");
                    setVerifiedFilter("all");
                    setPage(1);
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-2xl border border-zinc-200/80">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zinc-50/80 hover:bg-zinc-50">
                      <TableHead className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">
                        User
                      </TableHead>
                      <TableHead className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">
                        Role
                      </TableHead>
                      <TableHead className="hidden px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500 sm:table-cell">
                        Verification
                      </TableHead>
                      <TableHead className="hidden px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500 md:table-cell">
                        Joined
                      </TableHead>
                      <TableHead className="px-5 py-3.5 text-right text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {users.map((user) => {
                      const roleConfig = getRoleConfig(user.role);
                      return (
                        <TableRow
                          key={user.id}
                          className="group border-zinc-100 transition-colors hover:bg-indigo-50/30"
                        >
                          {/* User cell */}
                          <TableCell className="px-5 py-3.5">
                            <div className="flex min-w-0 items-center gap-3">
                              <UserAvatar user={user} size="md" />
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <p className="truncate text-sm font-semibold text-zinc-900">
                                    {user.name || (
                                      <span className="italic text-zinc-400">
                                        No display name
                                      </span>
                                    )}
                                  </p>
                                  {user.verified && (
                                    <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                                  )}
                                  {user.verifiedArtists && (
                                    <BadgeCheck className="size-3.5 shrink-0 text-violet-500" />
                                  )}
                                </div>
                                <p className="truncate text-xs text-zinc-400">
                                  @{user.username}
                                  {user.country && (
                                    <span className="ml-1.5 text-zinc-300">·</span>
                                  )}
                                  {user.country && (
                                    <span className="ml-1 text-zinc-400">{user.country}</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          {/* Role */}
                          <TableCell className="px-5 py-3.5">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                                roleConfig.className,
                              )}
                            >
                              <span
                                className={cn(
                                  "size-1.5 rounded-full",
                                  roleConfig.dot,
                                )}
                              />
                              {user.role}
                            </span>
                          </TableCell>

                          {/* Verification status */}
                          <TableCell className="hidden px-5 py-3.5 sm:table-cell">
                            <div className="flex flex-col gap-1">
                              <span
                                className={cn(
                                  "inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
                                  user.verified
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-zinc-50 text-zinc-500",
                                )}
                              >
                                {user.verified ? (
                                  <CheckCircle2 className="size-3" />
                                ) : (
                                  <XCircle className="size-3" />
                                )}
                                {user.verified ? "Email verified" : "Not verified"}
                              </span>
                              {user.verifiedArtists && (
                                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">
                                  <BadgeCheck className="size-3" />
                                  Verified artist
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* Joined date */}
                          <TableCell className="hidden px-5 py-3.5 text-sm text-zinc-500 md:table-cell">
                            {formatDate(user.createdAt)}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="px-5 py-3.5 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    variant="outline"
                                    size="icon-sm"
                                    className="rounded-xl border-zinc-200 bg-white opacity-60 transition-opacity group-hover:opacity-100"
                                  />
                                }
                              >
                                <MoreHorizontal className="size-4" />
                              </DropdownMenuTrigger>

                              <DropdownMenuContent
                                align="end"
                                className="w-48 rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-xl shadow-black/5"
                              >
                                <DropdownMenuItem
                                  className="rounded-xl gap-2 text-sm"
                                  onClick={() => handleOpenView(user)}
                                >
                                  <Eye className="size-4 text-zinc-500" />
                                  View details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="rounded-xl gap-2 text-sm"
                                  onClick={() => handleOpenEdit(user)}
                                >
                                  <Pencil className="size-4 text-zinc-500" />
                                  Edit user
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="rounded-xl gap-2 text-sm"
                                  onClick={() => quickToggleMutation.mutate(user)}
                                >
                                  {user.verified ? (
                                    <XCircle className="size-4 text-zinc-500" />
                                  ) : (
                                    <CheckCircle2 className="size-4 text-zinc-500" />
                                  )}
                                  {user.verified ? "Revoke verification" : "Set verified"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="my-1" />
                                <DropdownMenuItem
                                  className="rounded-xl gap-2 text-sm text-red-600 focus:bg-red-50 focus:text-red-600"
                                  onClick={() => setDeleteTarget(user)}
                                >
                                  <Trash2 className="size-4" />
                                  Delete user
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-zinc-500">
                  Halaman{" "}
                  <span className="font-semibold text-zinc-900">{page}</span>{" "}
                  dari{" "}
                  <span className="font-semibold text-zinc-900">{totalPages}</span>
                  {" "}·{" "}
                  <span className="font-semibold text-zinc-900">{users.length}</span>{" "}
                  dari{" "}
                  <span className="font-semibold text-zinc-900">{total.toLocaleString("id-ID")}</span>{" "}
                  user ditampilkan
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-xl border-zinc-200 bg-white text-sm disabled:opacity-40"
                    disabled={page <= 1 || usersQuery.isFetching}
                    onClick={() => setPage(1)}
                  >
                    ««
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-xl border-zinc-200 bg-white text-sm disabled:opacity-40"
                    disabled={page <= 1 || usersQuery.isFetching}
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  >
                    <ChevronLeft className="size-4" />
                    Prev
                  </Button>
                  <div className="min-w-[80px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-center text-sm font-semibold text-zinc-800">
                    {page} / {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-xl border-zinc-200 bg-white text-sm disabled:opacity-40"
                    disabled={page >= totalPages || usersQuery.isFetching}
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  >
                    Next
                    <ChevronRight className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-xl border-zinc-200 bg-white text-sm disabled:opacity-40"
                    disabled={page >= totalPages || usersQuery.isFetching}
                    onClick={() => setPage(totalPages)}
                  >
                    »»
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── View Detail Dialog ──────────────────────────── */}
      <Dialog
        open={viewOpen}
        onOpenChange={(open) => {
          setViewOpen(open);
          if (!open) setSelectedUserId(null);
        }}
      >
        <DialogContent
          className="flex max-h-[90dvh] w-full max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-[28px] border border-zinc-200 bg-white p-0 sm:max-w-lg"
          showCloseButton={false}
        >
          {/* Header */}
          <div className="relative shrink-0 overflow-hidden bg-gradient-to-r from-slate-900 to-indigo-950 p-6">
            <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-indigo-500/15 blur-2xl" />
            <DialogHeader className="relative gap-1.5">
              <DialogTitle className="text-xl font-semibold text-white">
                User Profile
              </DialogTitle>
              <DialogDescription className="text-sm text-white/60">
                Complete account information.
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {detailQuery.isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-24 rounded-3xl" />
                <Skeleton className="h-40 rounded-3xl" />
              </div>
            ) : activeDetail ? (
              <div className="space-y-5">
                {/* Profile card */}
                <div className="flex flex-col gap-4 rounded-3xl border border-zinc-200 bg-zinc-50/50 p-5 sm:flex-row sm:items-start">
                  <UserAvatar user={activeDetail} size="lg" />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold text-zinc-900">
                      {activeDetail.name || (
                        <span className="italic text-zinc-400">No display name</span>
                      )}
                    </h3>
                    <p className="text-sm text-zinc-500">@{activeDetail.username}</p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      {/* Role badge */}
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                          getRoleConfig(activeDetail.role).className,
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            getRoleConfig(activeDetail.role).dot,
                          )}
                        />
                        {activeDetail.role}
                      </span>
                      {activeDetail.verified && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold text-white">
                          <CheckCircle2 className="size-3" />
                          Verified
                        </span>
                      )}
                      {activeDetail.verifiedArtists && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                          <BadgeCheck className="size-3" />
                          Artist
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Info grid */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { label: "Email", value: activeDetail.email, full: false },
                    { label: "Country", value: activeDetail.country || "—", full: false },
                    {
                      label: "Joined",
                      value: formatDate(activeDetail.createdAt, true),
                      full: false,
                    },
                    {
                      label: "Artist Status",
                      value: activeDetail.verifiedArtists
                        ? "Verified Artist ✓"
                        : "Regular User",
                      full: false,
                    },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-zinc-200 bg-white p-4"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                        {label}
                      </p>
                      <p className="mt-2 break-all text-sm font-medium text-zinc-800">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Bio */}
                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                    Bio
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                    {activeDetail.bio || (
                      <span className="italic text-zinc-400">No bio yet.</span>
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
                User details not available.
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 rounded-b-[28px] border-t border-zinc-100 bg-zinc-50/80 px-6 py-4">
            <Button
              variant="outline"
              className="rounded-xl border-zinc-200 bg-white text-sm"
              onClick={() => {
                setViewOpen(false);
                setSelectedUserId(null);
              }}
            >
              Close
            </Button>
            <Button
              className="rounded-xl bg-indigo-600 text-sm text-white hover:bg-indigo-500"
              disabled={!activeDetail}
              onClick={() => {
                if (activeDetail) handleOpenEdit(activeDetail);
                setViewOpen(false);
              }}
            >
              <Pencil className="size-4" />
              Edit User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ─────────────────────────────────── */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setSelectedUserId(null);
        }}
      >
        <DialogContent
          className="flex max-h-[90dvh] w-full max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-[28px] border border-zinc-200 bg-white p-0 sm:max-w-2xl"
          showCloseButton={false}
        >
          {/* Header */}
          <div className="relative shrink-0 overflow-hidden bg-gradient-to-r from-slate-900 to-indigo-950 p-6">
            <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-violet-500/15 blur-2xl" />
            <DialogHeader className="relative gap-1.5">
              <DialogTitle className="text-xl font-semibold text-white">
                Edit User
              </DialogTitle>
              <DialogDescription className="text-sm text-white/60">
                Update user data directly from the admin panel.
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto space-y-5 p-6">
            {detailQuery.isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 rounded-2xl" />
                <Skeleton className="h-12 rounded-2xl" />
                <Skeleton className="h-32 rounded-2xl" />
              </div>
            ) : (
              <>
                {/* Info banner */}
                <div className="flex gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-800">
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-indigo-500" />
                  <p>
                    Avatars and banners are managed via MinIO. To update media,
                    direct uploads to MinIO storage first.
                  </p>
                </div>

                {/* Form fields */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name" className="text-sm font-medium text-zinc-700">
                      Display Name
                    </Label>
                    <Input
                      id="edit-name"
                      value={form.name}
                      onChange={(e) => patchForm("name", e.target.value)}
                      placeholder="Full name"
                      className="h-11 rounded-2xl border-zinc-200 bg-zinc-50 focus-visible:border-indigo-400 focus-visible:ring-indigo-500/20 focus-visible:bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-username" className="text-sm font-medium text-zinc-700">
                      Username
                    </Label>
                    <Input
                      id="edit-username"
                      value={form.username}
                      onChange={(e) => patchForm("username", e.target.value)}
                      placeholder="@username"
                      className="h-11 rounded-2xl border-zinc-200 bg-zinc-50 focus-visible:border-indigo-400 focus-visible:ring-indigo-500/20 focus-visible:bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-email" className="text-sm font-medium text-zinc-700">
                      Email
                    </Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => patchForm("email", e.target.value)}
                      placeholder="email@domain.com"
                      className="h-11 rounded-2xl border-zinc-200 bg-zinc-50 focus-visible:border-indigo-400 focus-visible:ring-indigo-500/20 focus-visible:bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-role" className="text-sm font-medium text-zinc-700">
                      Role
                    </Label>
                    <Select
                      value={form.role}
                      onValueChange={(val) => { if (val) patchForm("role", val); }}
                    >
                      <SelectTrigger
                        id="edit-role"
                        className="h-11 w-full rounded-2xl border-zinc-200 bg-zinc-50 text-sm text-zinc-900 focus:ring-indigo-500/20"
                      >
                        <SelectValue placeholder="Pilih role" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-zinc-200 bg-white">
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="artist">Artist</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-country" className="text-sm font-medium text-zinc-700">
                      Country
                    </Label>
                    <Input
                      id="edit-country"
                      value={form.country}
                      onChange={(e) => patchForm("country", e.target.value)}
                      placeholder="e.g. Indonesia"
                      className="h-11 rounded-2xl border-zinc-200 bg-zinc-50 focus-visible:border-indigo-400 focus-visible:ring-indigo-500/20 focus-visible:bg-white"
                    />
                  </div>

                  {/* Email Verification toggle */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-zinc-700">
                      Email Verification
                    </Label>
                    <button
                      type="button"
                      onClick={() => patchForm("verified", !form.verified)}
                      className={cn(
                        "flex h-11 w-full items-center justify-between rounded-2xl border px-4 text-sm font-medium transition-all duration-200",
                        form.verified
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-100"
                          : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300",
                      )}
                    >
                      <span>{form.verified ? "✓ Email verified" : "Not verified"}</span>
                      {form.verified ? (
                        <CheckCircle2 className="size-4 text-emerald-500" />
                      ) : (
                        <XCircle className="size-4 text-zinc-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Artist verification - full width */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-zinc-700">
                    Artist Verification
                  </Label>
                  <button
                    type="button"
                    onClick={() => patchForm("verifiedArtists", !form.verifiedArtists)}
                    className={cn(
                      "flex h-11 w-full items-center justify-between rounded-2xl border px-4 text-sm font-medium transition-all duration-200",
                      form.verifiedArtists
                        ? "border-violet-200 bg-violet-50 text-violet-700 ring-2 ring-violet-100"
                        : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300",
                    )}
                  >
                    <span>
                      {form.verifiedArtists ? "✓ Verified Artist" : "Regular User"}
                    </span>
                    {form.verifiedArtists ? (
                      <BadgeCheck className="size-4 text-violet-500" />
                    ) : (
                      <UserRound className="size-4 text-zinc-400" />
                    )}
                  </button>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="edit-bio" className="text-sm font-medium text-zinc-700">
                    Bio
                    <span className="ml-2 text-xs font-normal text-zinc-400">
                      ({form.bio.length} characters)
                    </span>
                  </Label>
                  <textarea
                    id="edit-bio"
                    value={form.bio}
                    onChange={(e) => patchForm("bio", e.target.value)}
                    rows={4}
                    placeholder="Short description about the user..."
                    className="w-full resize-none rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 transition-all focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter className="shrink-0 rounded-b-[28px] border-t border-zinc-100 bg-zinc-50/80 px-6 py-4">
            <Button
              variant="outline"
              className="rounded-xl border-zinc-200 bg-white text-sm"
              onClick={() => {
                handleDetailSync();
                setEditOpen(false);
                setSelectedUserId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-indigo-600 text-sm text-white hover:bg-indigo-500 disabled:opacity-50"
              disabled={selectedUserId === null || updateMutation.isPending}
              onClick={() => {
                if (selectedUserId === null) return;
                updateMutation.mutate({ id: selectedUserId, data: form });
              }}
            >
              {updateMutation.isPending ? (
                <>
                  <span className="mr-2 size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ───────────────────────── */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="w-full max-w-[calc(100%-2rem)] rounded-[28px] border border-zinc-200 bg-white p-0 sm:max-w-md">
          <div className="p-6">
            <DialogHeader className="gap-4">
              <div className="flex size-14 items-center justify-center rounded-3xl bg-red-50 text-red-500">
                <AlertTriangle className="size-7" />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-xl font-bold text-zinc-900">
                  Hapus User?
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed text-zinc-500">
                  Tindakan ini akan menghapus akun{" "}
                  <span className="font-semibold text-zinc-900">
                    {deleteTarget?.name || deleteTarget?.username}
                  </span>{" "}
                  secara permanen dan tidak dapat dikembalikan.
                </DialogDescription>
              </div>
            </DialogHeader>

            {/* User preview card */}
            {deleteTarget && (
              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50/50 p-4">
                <UserAvatar user={deleteTarget} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-zinc-900">
                    {deleteTarget.name || deleteTarget.username}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {deleteTarget.email}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                    getRoleConfig(deleteTarget.role).className,
                  )}
                >
                  {deleteTarget.role}
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="rounded-b-[28px] border-t border-zinc-100 bg-zinc-50/80 px-6 py-4">
            <Button
              variant="outline"
              className="rounded-xl border-zinc-200 bg-white text-sm"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl text-sm"
              disabled={!deleteTarget || deleteMutation.isPending}
              onClick={() => {
                if (!deleteTarget) return;
                deleteMutation.mutate(deleteTarget.id);
              }}
            >
              {deleteMutation.isPending ? (
                <>
                  <span className="mr-2 size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  Delete User
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
