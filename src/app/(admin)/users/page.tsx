"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Download, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { DeleteUserDialog } from "./_components/DeleteUserDialog";
import { EditUserDialog } from "./_components/EditUserDialog";
import { KpiStrip } from "./_components/KpiStrip";
import { ModerationDialog } from "./_components/ModerationDialog";
import { UsersTable } from "./_components/UsersTable";
import { UsersToolbar } from "./_components/UsersToolbar";
import { ViewUserDialog } from "./_components/ViewUserDialog";
import {
  useArtistRequestsMeta,
  useUserDetail,
  useUsersList,
} from "./_hooks/useUsersData";
import { useUserMutations } from "./_hooks/useUserMutations";
import type {
  ModerationAction,
  UpdateUserPayload,
  UserItem,
} from "./_lib/types";

export default function UsersPage() {
  // ── Filters / pagination state ──────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState("all");
  const [verifiedFilter, setVerifiedFilter] = useState("all");

  // ── Dialog state ────────────────────────────────────────────────────────────
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [moderationTarget, setModerationTarget] = useState<UserItem | null>(
    null,
  );
  const [moderationAction, setModerationAction] =
    useState<ModerationAction>("BAN");
  const [moderationReason, setModerationReason] = useState("");
  const [moderationDurationHours, setModerationDurationHours] = useState("24");

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

  // ── Data ────────────────────────────────────────────────────────────────────
  const usersQuery = useUsersList({
    page,
    search,
    roleFilter,
    verifiedFilter,
  });
  const detailQuery = useUserDetail(selectedUserId, editOpen || viewOpen);
  const artistRequestsMetaQuery = useArtistRequestsMeta();

  const mutations = useUserMutations();

  // ── Derived ─────────────────────────────────────────────────────────────────
  const users = usersQuery.data?.data ?? [];
  const meta = usersQuery.data?.meta;
  const activeDetail = detailQuery.data;
  const pendingArtistRequests = artistRequestsMetaQuery.data?.meta?.total ?? 0;
  const hasActiveFilters =
    search !== "" || roleFilter !== "all" || verifiedFilter !== "all";

  useEffect(() => {
    if (!meta) return;
    if (meta.page !== page) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPage(meta.page);
    }
  }, [meta, page]);

  const deleteConfirmValid = useMemo(
    () =>
      Boolean(deleteTarget) &&
      deleteConfirm.trim() === deleteTarget?.username,
    [deleteConfirm, deleteTarget],
  );

  // ── Handlers ────────────────────────────────────────────────────────────────
  function resetPagination() {
    setPage(1);
  }

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    resetPagination();
    setSearch(searchInput.trim());
  }

  function handleClearSearch() {
    setSearchInput("");
    setSearch("");
    resetPagination();
  }

  function handleClearAll() {
    setSearchInput("");
    setSearch("");
    setRoleFilter("all");
    setVerifiedFilter("all");
    resetPagination();
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

  function handleOpenModeration(user: UserItem, action: ModerationAction) {
    setModerationTarget(user);
    setModerationAction(action);
    setModerationReason("");
    setModerationDurationHours("24");
  }

  function patchForm<K extends keyof UpdateUserPayload>(
    key: K,
    value: UpdateUserPayload[K],
  ) {
    setForm((cur) => ({ ...cur, [key]: value }));
  }

  function closeModeration() {
    setModerationTarget(null);
    setModerationReason("");
    setModerationDurationHours("24");
  }

  function submitModeration() {
    if (!moderationTarget) return;

    const reason = moderationReason.trim();
    const durationHours = Number.parseInt(moderationDurationHours, 10);

    if (moderationAction === "SUSPEND") {
      if (!Number.isFinite(durationHours) || durationHours <= 0) {
        toast.error("Suspend duration must be greater than 0 hour");
        return;
      }
    }

    mutations.moderate.mutate(
      {
        id: moderationTarget.id,
        action: moderationAction,
        ...(reason ? { reason } : {}),
        ...(moderationAction === "SUSPEND" && Number.isFinite(durationHours)
          ? { durationHours }
          : {}),
      },
      { onSuccess: () => closeModeration() },
    );
  }

  return (
    <div className="space-y-6">
      {/* Page head */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Users
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Cari, filter, dan moderasi akun terdaftar dari admin panel.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/artist-requests"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
          >
            <ShieldCheck className="size-3.5" />
            Artist Requests
            {pendingArtistRequests > 0 && (
              <span className="ml-1 inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-amber-800">
                {pendingArtistRequests}
              </span>
            )}
          </Link>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
            onClick={() => toast.info("Invite admin coming soon")}
          >
            <Plus className="size-3.5" />
            Invite admin
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:brightness-105"
            onClick={() => toast.info("Export CSV coming soon")}
          >
            <Download className="size-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      <KpiStrip pendingArtistRequests={pendingArtistRequests} />

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-col gap-4 border-b border-border/60 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight">
              All users
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {users.length > 0
                ? `${users.length} users loaded${hasActiveFilters ? " · filters active" : ""}`
                : "Search, filter, and moderate accounts."}
            </p>
          </div>
          <UsersToolbar
            searchInput={searchInput}
            onSearchInputChange={setSearchInput}
            onSearchSubmit={handleSearchSubmit}
            onClearSearch={handleClearSearch}
            roleFilter={roleFilter}
            onRoleChange={(v) => {
              setRoleFilter(v || "all");
              resetPagination();
            }}
            verifiedFilter={verifiedFilter}
            onVerifiedChange={(v) => {
              setVerifiedFilter(v || "all");
              resetPagination();
            }}
            hasActiveFilters={hasActiveFilters}
            onClearAll={handleClearAll}
          />
        </div>

        <UsersTable
          users={users}
          isLoading={usersQuery.isLoading}
          hasActiveFilters={hasActiveFilters}
          page={meta?.page ?? page}
          totalPages={meta?.totalPages ?? page}
          total={meta?.total ?? 0}
          isFetching={usersQuery.isFetching}
          onPageChange={setPage}
          onView={handleOpenView}
          onEdit={handleOpenEdit}
          onToggleVerify={(u) => mutations.quickToggleVerify.mutate(u)}
          onApproveArtist={(u) => mutations.approveArtist.mutate(u.id)}
          onModerate={handleOpenModeration}
          onDelete={(u) => setDeleteTarget(u)}
        />
      </section>

      <ViewUserDialog
        open={viewOpen}
        onOpenChange={(open) => {
          setViewOpen(open);
          if (!open) setSelectedUserId(null);
        }}
        activeDetail={activeDetail}
        isLoading={detailQuery.isLoading}
        onEditClick={() => {
          if (activeDetail) handleOpenEdit(activeDetail);
          setViewOpen(false);
        }}
      />

      <EditUserDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setSelectedUserId(null);
        }}
        form={form}
        patchForm={patchForm}
        isLoading={detailQuery.isLoading}
        isSubmitting={mutations.update.isPending}
        canSubmit={selectedUserId !== null}
        onSubmit={() => {
          if (selectedUserId === null) return;
          mutations.update.mutate(
            { id: selectedUserId, data: form },
            {
              onSuccess: () => {
                setEditOpen(false);
                setSelectedUserId(null);
              },
            },
          );
        }}
      />

      <ModerationDialog
        target={moderationTarget}
        action={moderationAction}
        setAction={setModerationAction}
        reason={moderationReason}
        setReason={setModerationReason}
        durationHours={moderationDurationHours}
        setDurationHours={setModerationDurationHours}
        onCancel={closeModeration}
        onSubmit={submitModeration}
        isSubmitting={mutations.moderate.isPending}
      />

      <DeleteUserDialog
        target={deleteTarget}
        confirmInput={deleteConfirm}
        onConfirmInputChange={setDeleteConfirm}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteConfirm("");
        }}
        isSubmitting={mutations.remove.isPending}
        canSubmit={deleteConfirmValid}
        onSubmit={() => {
          if (!deleteTarget) return;
          mutations.remove.mutate(deleteTarget.id, {
            onSuccess: () => {
              setDeleteTarget(null);
              setDeleteConfirm("");
            },
          });
        }}
      />
    </div>
  );
}
