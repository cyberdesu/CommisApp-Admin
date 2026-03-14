"use client";

import { useMemo, useState } from "react";
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
  Star,
  Trash2,
  UserRound,
  Users,
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

function resolveMediaUrl(path?: string | null) {
  if (!path) return null;
  return path;
}

function getRoleBadgeClass(role: string) {
  const value = role.toLowerCase();

  if (value.includes("admin")) {
    return "bg-black text-white hover:bg-black";
  }

  if (value.includes("artist")) {
    return "bg-indigo-500 text-white hover:bg-indigo-400";
  }

  if (value.includes("manager")) {
    return "bg-indigo-50 text-indigo-700 hover:bg-indigo-100";
  }

  return "bg-zinc-100 text-zinc-700 hover:bg-zinc-100";
}

function UserAvatar({
  user,
  className,
}: {
  user: Pick<UserItem, "avatar" | "name" | "username">;
  className?: string;
}) {
  const avatarUrl = resolveMediaUrl(user.avatar);
  const fallback = (
    user.name?.trim()?.[0] ||
    user.username?.trim()?.[0] ||
    "U"
  ).toUpperCase();

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={user.name || user.username}
        className={cn(
          "size-11 rounded-2xl border border-black/10 object-cover",
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex size-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 font-semibold text-slate-600",
        className,
      )}
    >
      {fallback}
    </div>
  );
}

function StatsCards({ users, total }: { users: UserItem[]; total: number }) {
  const stats = useMemo(() => {
    const verifiedCount = users.filter((user) => user.verified).length;
    const verifiedArtistCount = users.filter(
      (user) => user.verifiedArtists,
    ).length;
    const adminCount = users.filter((user) =>
      user.role.toLowerCase().includes("admin"),
    ).length;

    return [
      {
        label: "Total Users",
        value: total.toLocaleString("id-ID"),
        detail: "Semua user terdaftar",
        icon: Users,
      },
      {
        label: "Verified",
        value: verifiedCount.toLocaleString("id-ID"),
        detail: "Email/account verified",
        icon: CheckCircle2,
      },
      {
        label: "Verified Artists",
        value: verifiedArtistCount.toLocaleString("id-ID"),
        detail: "Artist yang lolos verifikasi",
        icon: Star,
      },
      {
        label: "Admin Role",
        value: adminCount.toLocaleString("id-ID"),
        detail: "User dengan akses admin",
        icon: ShieldCheck,
      },
    ];
  }, [total, users]);

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ label, value, detail, icon: Icon }) => (
        <Card
          key={label}
          className="rounded-3xl border border-zinc-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/10"
        >
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardDescription className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
                {label}
              </CardDescription>
              <CardTitle className="text-3xl font-bold tracking-tight text-black">
                {value}
              </CardTitle>
            </div>
            <div className="flex size-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600">
              <Icon className="size-5" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-600">{detail}</p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

function UsersTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="grid grid-cols-[1.8fr_1.2fr_1fr_1fr_80px] gap-3 rounded-2xl border border-zinc-200 p-4"
        >
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export default function UsersPage() {
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState("all");
  const [verifiedFilter, setVerifiedFilter] = useState("all");

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

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: number; data: UpdateUserPayload }) => {
      const response = await apiClient.patch(
        `/users/${payload.id}`,
        payload.data,
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("User berhasil diupdate");
      setEditOpen(false);
      setSelectedUserId(null);
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      void queryClient.invalidateQueries({ queryKey: ["user-detail"] });
    },
    onError: () => {
      toast.error("Gagal update user");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.delete(`/users/${id}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success("User berhasil dihapus");
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: () => {
      toast.error("Gagal menghapus user");
    },
  });

  const quickToggleMutation = useMutation({
    mutationFn: async (user: UserItem) => {
      const response = await apiClient.patch(`/users/${user.id}`, {
        verified: !user.verified,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Status verified berhasil diupdate");
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: () => {
      toast.error("Gagal update status verified");
    },
  });

  const users = usersQuery.data?.data ?? [];
  const meta = usersQuery.data?.meta;
  const total = meta?.total ?? 0;
  const totalPages = Math.max(meta?.totalPages ?? 1, 1);

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
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

  const activeDetail = detailQuery.data;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-6 p-6 md:flex-row md:items-end md:justify-between md:p-8">
          <div className="space-y-3">
            <Badge className="rounded-md bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 border-indigo-100">
              User Management
            </Badge>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                Kelola User Secara Real
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-500 md:text-base">
                Modul ini terhubung ke data user real. Cari user, lihat detail,
                edit metadata, ubah status verifikasi, hapus user, dan filter data.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Source Data
              </p>
              <p className="mt-1.5 text-base font-semibold text-slate-900">
                Prisma DB
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Media
              </p>
              <p className="mt-1.5 text-base font-semibold text-slate-900">
                MinIO Store
              </p>
            </div>
          </div>
        </div>
      </section>

      <StatsCards users={users} total={total} />

      <Card className="rounded-3xl border border-zinc-200 bg-white shadow-sm">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-zinc-100 pb-5">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold text-black">
              Daftar Users
            </CardTitle>
            <CardDescription className="text-sm text-zinc-500">
              Search, filter dan kelola akun user terdaftar.
            </CardDescription>
          </div>

          <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
            <form
              onSubmit={handleSearchSubmit}
              className="flex w-full gap-2 sm:max-w-xs"
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Cari user..."
                  className="h-[38px] rounded-lg border-slate-200 bg-white pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20 shadow-sm"
                />
              </div>
              <Button
                type="submit"
                className="h-[38px] rounded-lg bg-indigo-600 px-4 font-semibold text-white hover:bg-indigo-700 shadow-sm"
              >
                Search
              </Button>
            </form>

            <div className="flex gap-2">
              <Select value={roleFilter} onValueChange={(val) => { setRoleFilter(val || "all"); setPage(1); }}>
                <SelectTrigger className="h-[38px] w-[130px] rounded-xl border-zinc-200 bg-white text-sm">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-zinc-200 bg-white">
                  <SelectItem value="all">Semua Role</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="artist">Artist</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>

              <Select value={verifiedFilter} onValueChange={(val) => { setVerifiedFilter(val || "all"); setPage(1); }}>
                <SelectTrigger className="h-[38px] w-[140px] rounded-xl border-zinc-200 bg-white text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-zinc-200 bg-white">
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="true">Verified</SelectItem>
                  <SelectItem value="false">Unverified</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {usersQuery.isLoading ? (
            <UsersTableSkeleton />
          ) : users.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <Users className="size-7" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-black">
                Tidak ada user ditemukan
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
                Coba ubah kata kunci pencarian atau reset filter untuk melihat
                data user yang tersedia.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-3xl border border-zinc-200">
                <Table>
                  <TableHeader className="bg-zinc-50">
                    <TableRow className="hover:bg-zinc-50">
                      <TableHead className="px-4 py-3 text-xs uppercase tracking-[0.18em] text-zinc-500">
                        User
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs uppercase tracking-[0.18em] text-zinc-500">
                        Role
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs uppercase tracking-[0.18em] text-zinc-500">
                        Status
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs uppercase tracking-[0.18em] text-zinc-500">
                        Created
                      </TableHead>
                      <TableHead className="px-4 py-3 text-right text-xs uppercase tracking-[0.18em] text-zinc-500">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} className="hover:bg-slate-50/50">
                        <TableCell className="px-4 py-4 align-top">
                          <div className="flex min-w-0 items-start gap-3">
                            <UserAvatar user={user} />
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate font-semibold text-slate-900">
                                  {user.name || "No display name"}
                                </p>
                                {user.verified ? (
                                  <Badge className="rounded-md bg-indigo-50 px-1.5 py-0 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-100 border-indigo-100">
                                    Verified
                                  </Badge>
                                ) : null}
                                {user.verifiedArtists ? (
                                  <Badge className="rounded-md bg-emerald-50 px-1.5 py-0 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100 border-emerald-100">
                                    Artist
                                  </Badge>
                                ) : null}
                              </div>

                              <p className="truncate text-sm text-zinc-500">
                                @{user.username}
                              </p>
                              <p className="truncate text-sm text-zinc-500">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="px-4 py-4 align-top">
                          <Badge
                            className={cn(
                              "rounded-full px-3 py-1 text-xs font-semibold",
                              getRoleBadgeClass(user.role),
                            )}
                          >
                            {user.role}
                          </Badge>
                        </TableCell>

                        <TableCell className="px-4 py-4 align-top">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-zinc-700">
                              {user.verified ? (
                                <CheckCircle2 className="size-4 text-emerald-500" />
                              ) : (
                                <XCircle className="size-4 text-zinc-400" />
                              )}
                              <span>
                                {user.verified ? "Verified" : "Not verified"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-zinc-700">
                              {user.verifiedArtists ? (
                                <BadgeCheck className="size-4 text-black" />
                              ) : (
                                <UserRound className="size-4 text-zinc-400" />
                              )}
                              <span>
                                {user.verifiedArtists
                                  ? "Verified artist"
                                  : "Regular user"}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="px-4 py-4 align-top text-sm text-zinc-600">
                          {new Date(user.createdAt).toLocaleDateString(
                            "id-ID",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </TableCell>

                        <TableCell className="px-4 py-4 text-right align-top">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="outline"
                                  size="icon-sm"
                                  className="rounded-xl border-zinc-200 bg-white"
                                />
                              }
                            >
                              <MoreHorizontal className="size-4" />
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                              align="end"
                              className="w-48 rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-xl"
                            >
                              <DropdownMenuItem
                                className="rounded-xl"
                                onClick={() => handleOpenView(user)}
                              >
                                <Eye className="size-4" />
                                Lihat detail
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="rounded-xl"
                                onClick={() => handleOpenEdit(user)}
                              >
                                <Pencil className="size-4" />
                                Edit user
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="rounded-xl"
                                onClick={() => quickToggleMutation.mutate(user)}
                              >
                                {user.verified ? (
                                  <XCircle className="size-4" />
                                ) : (
                                  <CheckCircle2 className="size-4" />
                                )}
                                {user.verified
                                  ? "Batalkan verified"
                                  : "Set verified"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="rounded-xl text-red-600 focus:bg-red-50 focus:text-red-600"
                                onClick={() => setDeleteTarget(user)}
                              >
                                <Trash2 className="size-4" />
                                Hapus user
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-zinc-600">
                  Menampilkan{" "}
                  <span className="font-semibold text-black">
                    {users.length}
                  </span>{" "}
                  dari <span className="font-semibold text-black">{total}</span>{" "}
                  user
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="rounded-xl border-zinc-200 bg-white"
                    disabled={page <= 1}
                    onClick={() =>
                      setPage((current) => Math.max(current - 1, 1))
                    }
                  >
                    <ChevronLeft className="size-4" />
                    Prev
                  </Button>
                  <div className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-black">
                    Page {page} / {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    className="rounded-xl border-zinc-200 bg-white"
                    disabled={page >= totalPages}
                    onClick={() =>
                      setPage((current) => Math.min(current + 1, totalPages))
                    }
                  >
                    Next
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={viewOpen}
        onOpenChange={(open) => {
          setViewOpen(open);
          if (!open) setSelectedUserId(null);
        }}
      >
        <DialogContent className="max-w-2xl rounded-[28px] border border-zinc-200 bg-white p-0">
          <div className="border-b border-zinc-100 bg-linear-to-r from-black to-zinc-900 p-6 text-white">
            <DialogHeader className="gap-2">
              <DialogTitle className="text-2xl font-semibold tracking-tight text-white">
                User Detail
              </DialogTitle>
              <DialogDescription className="text-sm text-white/70">
                Informasi lengkap user dari data real.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6">
            {detailQuery.isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-24 rounded-3xl" />
                <Skeleton className="h-40 rounded-3xl" />
              </div>
            ) : activeDetail ? (
              <div className="space-y-6">
                <div className="flex flex-col gap-4 rounded-3xl border border-zinc-200 p-5 sm:flex-row sm:items-center">
                  <UserAvatar user={activeDetail} className="size-16" />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-xl font-semibold text-black">
                      {activeDetail.name || "No display name"}
                    </h3>
                    <p className="truncate text-sm text-zinc-500">
                      @{activeDetail.username}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-semibold",
                          getRoleBadgeClass(activeDetail.role),
                        )}
                      >
                        {activeDetail.role}
                      </Badge>
                      {activeDetail.verified ? (
                        <Badge className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-400">
                          Verified
                        </Badge>
                      ) : (
                        <Badge className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100">
                          Unverified
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-zinc-200 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                      Email
                    </p>
                    <p className="mt-2 break-all text-sm font-medium text-black">
                      {activeDetail.email}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-zinc-200 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                      Country
                    </p>
                    <p className="mt-2 text-sm font-medium text-black">
                      {activeDetail.country || "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-zinc-200 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                      Created At
                    </p>
                    <p className="mt-2 text-sm font-medium text-black">
                      {new Date(activeDetail.createdAt).toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-zinc-200 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                      Artist Status
                    </p>
                    <p className="mt-2 text-sm font-medium text-black">
                      {activeDetail.verifiedArtists
                        ? "Verified Artist"
                        : "Regular User"}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-200 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Bio
                  </p>
                  <p className="mt-2 text-sm leading-7 text-zinc-700">
                    {activeDetail.bio || "Belum ada bio."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
                Detail user tidak tersedia.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setSelectedUserId(null);
        }}
      >
        <DialogContent className="max-w-3xl rounded-[28px] border border-zinc-200 bg-white p-0">
          <div className="border-b border-zinc-100 bg-linear-to-r from-black to-zinc-900 p-6 text-white">
            <DialogHeader className="gap-2">
              <DialogTitle className="text-2xl font-semibold tracking-tight text-white">
                Edit User
              </DialogTitle>
              <DialogDescription className="text-sm text-white/70">
                Update data user langsung dari admin panel.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-6 p-6">
            {detailQuery.isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 rounded-2xl" />
                <Skeleton className="h-12 rounded-2xl" />
                <Skeleton className="h-32 rounded-2xl" />
              </div>
            ) : (
              <>
                {activeDetail ? (
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900/70">
                    Avatar dan banner di sistem utama diasumsikan menggunakan
                    object path dari MinIO. Kalau nanti mau edit media user,
                    sebaiknya flow upload diarahkan ke storage MinIO terlebih
                    dahulu.
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Display Name</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      className="h-11 rounded-2xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={form.username}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          username: event.target.value,
                        }))
                      }
                      className="h-11 rounded-2xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={form.email}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      className="h-11 rounded-2xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      value={form.role}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          role: event.target.value,
                        }))
                      }
                      className="h-11 rounded-2xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={form.country}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          country: event.target.value,
                        }))
                      }
                      className="h-11 rounded-2xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email Verification</Label>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          verified: !current.verified,
                        }))
                      }
                      className={cn(
                        "flex h-11 w-full items-center justify-between rounded-2xl border px-4 text-sm font-medium transition",
                        form.verified
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-zinc-200 bg-white text-zinc-700",
                      )}
                    >
                      <span>{form.verified ? "Verified" : "Not verified"}</span>
                      {form.verified ? (
                        <CheckCircle2 className="size-4" />
                      ) : (
                        <XCircle className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Artist Verification</Label>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        verifiedArtists: !current.verifiedArtists,
                      }))
                    }
                    className={cn(
                      "flex h-11 w-full items-center justify-between rounded-2xl border px-4 text-sm font-medium transition",
                      form.verifiedArtists
                        ? "border-black/10 bg-black text-white"
                        : "border-zinc-200 bg-white text-zinc-700",
                    )}
                  >
                    <span>
                      {form.verifiedArtists
                        ? "Verified Artist"
                        : "Regular User"}
                    </span>
                    {form.verifiedArtists ? (
                      <BadgeCheck className="size-4" />
                    ) : (
                      <UserRound className="size-4" />
                    )}
                  </button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <textarea
                    id="bio"
                    value={form.bio}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        bio: event.target.value,
                      }))
                    }
                    className="min-h-32 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter className="rounded-b-[28px] border-t border-zinc-100 bg-zinc-50/80">
            <Button
              variant="outline"
              className="rounded-xl border-zinc-200 bg-white"
              onClick={() => {
                if (detailQuery.data) {
                  handleDetailSync();
                }
                setEditOpen(false);
                setSelectedUserId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-500"
              disabled={selectedUserId === null || updateMutation.isPending}
              onClick={() => {
                if (selectedUserId === null) return;
                updateMutation.mutate({
                  id: selectedUserId,
                  data: form,
                });
              }}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-lg rounded-[28px] border border-zinc-200 bg-white">
          <DialogHeader className="gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
              <AlertTriangle className="size-6" />
            </div>
            <DialogTitle className="text-xl font-semibold text-black">
              Hapus User
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-zinc-500">
              Tindakan ini akan menghapus user{" "}
              <span className="font-semibold text-black">
                {deleteTarget?.name || deleteTarget?.username}
              </span>
              . Pastikan kamu benar-benar yakin sebelum melanjutkan.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="rounded-b-[28px] border-t border-zinc-100 bg-zinc-50/80">
            <Button
              variant="outline"
              className="rounded-xl border-zinc-200 bg-white"
              onClick={() => setDeleteTarget(null)}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              disabled={!deleteTarget || deleteMutation.isPending}
              onClick={() => {
                if (!deleteTarget) return;
                deleteMutation.mutate(deleteTarget.id);
              }}
            >
              {deleteMutation.isPending ? "Deleting..." : "Hapus User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
