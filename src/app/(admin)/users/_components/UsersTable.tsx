"use client";

import { BadgeCheck, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/ui/pagination";
import {
  formatDate,
  getFinancePreview,
  getRolePill,
  isUserSuspended,
} from "../_lib/helpers";
import type { ModerationAction, UserItem } from "../_lib/types";
import { UserAvatar } from "./UserAvatar";
import { UserRowActions } from "./UserRowActions";
import { VerificationStack } from "./VerificationStack";

export function UsersTable({
  users,
  isLoading,
  hasActiveFilters,
  page,
  totalPages,
  total,
  isFetching,
  onPageChange,
  onView,
  onEdit,
  onToggleVerify,
  onApproveArtist,
  onModerate,
  onDelete,
}: {
  users: UserItem[];
  isLoading: boolean;
  hasActiveFilters: boolean;
  page: number;
  totalPages: number;
  total: number;
  isFetching: boolean;
  onPageChange: (next: number) => void;
  onView: (u: UserItem) => void;
  onEdit: (u: UserItem) => void;
  onToggleVerify: (u: UserItem) => void;
  onApproveArtist: (u: UserItem) => void;
  onModerate: (u: UserItem, a: ModerationAction) => void;
  onDelete: (u: UserItem) => void;
}) {
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border/60 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              <th className="px-5 py-3 text-left">User</th>
              <th className="px-5 py-3 text-left">Role</th>
              <th className="px-5 py-3 text-left">Verification</th>
              <th className="px-5 py-3 text-right">Earnings</th>
              <th className="px-5 py-3 text-right">Available</th>
              <th className="px-5 py-3 text-left">Joined</th>
              <th className="w-[60px] px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-12 text-center text-sm text-muted-foreground"
                >
                  Loading users…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-16 text-center text-sm text-muted-foreground"
                >
                  {hasActiveFilters
                    ? "Tidak ada user yang cocok dengan filter."
                    : "Belum ada user terdaftar."}
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const suspended = isUserSuspended(user);
                const fin = getFinancePreview(user.finance);
                return (
                  <tr
                    key={user.id}
                    className="border-b border-border/40 last:border-b-0 hover:bg-muted/40"
                  >
                    <td className="px-5 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <UserAvatar user={user} size="md" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-[13.5px] font-semibold text-foreground">
                              {user.name || (
                                <span className="italic font-medium text-muted-foreground/70">
                                  No display name
                                </span>
                              )}
                            </span>
                            {user.verified && (
                              <CheckCircle2 className="size-3 shrink-0 text-emerald-600" />
                            )}
                            {user.verifiedArtists && (
                              <BadgeCheck className="size-3 shrink-0 text-violet-600" />
                            )}
                          </div>
                          <div className="truncate text-[12px] text-muted-foreground">
                            @{user.username}
                            {user.country ? ` · ${user.country}` : ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                          getRolePill(user.role),
                        )}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <VerificationStack user={user} suspended={suspended} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className={cn(
                          "font-mono text-[13px] font-semibold tabular-nums",
                          fin ? "text-foreground" : "text-muted-foreground/60",
                        )}
                      >
                        {fin ? fin.earned : "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className={cn(
                          "font-mono text-[13px] tabular-nums",
                          fin
                            ? "font-semibold text-emerald-700"
                            : "text-muted-foreground/60",
                        )}
                      >
                        {fin ? fin.available : "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[12.5px] text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <UserRowActions
                        user={user}
                        suspended={suspended}
                        onView={() => onView(user)}
                        onEdit={() => onEdit(user)}
                        onToggleVerify={() => onToggleVerify(user)}
                        onApproveArtist={() => onApproveArtist(user)}
                        onModerate={(a) => onModerate(user, a)}
                        onDelete={() => onDelete(user)}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-start justify-between gap-3 border-t border-border/60 px-5 py-3 text-[12.5px] text-muted-foreground sm:flex-row sm:items-center">
        <span>
          Page{" "}
          <strong className="font-semibold text-foreground">{page}</strong> of{" "}
          <strong className="font-semibold text-foreground">{totalPages}</strong>{" "}
          ·{" "}
          <strong className="font-semibold text-foreground">
            {total.toLocaleString("en-US")}
          </strong>{" "}
          users
        </span>
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
          disabled={isFetching}
        />
      </div>
    </>
  );
}
