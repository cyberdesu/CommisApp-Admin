"use client";

import {
  BadgeCheck,
  Ban,
  CheckCircle2,
  Clock3,
  Eye,
  MoreHorizontal,
  Pencil,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ModerationAction, UserItem } from "../_lib/types";

export function UserRowActions({
  user,
  suspended,
  onView,
  onEdit,
  onToggleVerify,
  onApproveArtist,
  onModerate,
  onDelete,
}: {
  user: UserItem;
  suspended: boolean;
  onView: () => void;
  onEdit: () => void;
  onToggleVerify: () => void;
  onApproveArtist: () => void;
  onModerate: (action: ModerationAction) => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-52 rounded-xl border border-border bg-card p-1 shadow-lg"
      >
        <DropdownMenuItem className="gap-2 rounded-lg text-sm" onClick={onView}>
          <Eye className="size-3.5 text-muted-foreground" />
          View details
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 rounded-lg text-sm" onClick={onEdit}>
          <Pencil className="size-3.5 text-muted-foreground" />
          Edit user
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2 rounded-lg text-sm"
          onClick={onToggleVerify}
        >
          {user.verified ? (
            <XCircle className="size-3.5 text-muted-foreground" />
          ) : (
            <CheckCircle2 className="size-3.5 text-muted-foreground" />
          )}
          {user.verified ? "Revoke verification" : "Set verified"}
        </DropdownMenuItem>
        {!user.verifiedArtists && (
          <DropdownMenuItem
            className="gap-2 rounded-lg text-sm"
            onClick={onApproveArtist}
          >
            <BadgeCheck className="size-3.5 text-muted-foreground" />
            Approve artist
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="my-1" />
        {user.isBanned ? (
          <DropdownMenuItem
            className="gap-2 rounded-lg text-sm"
            onClick={() => onModerate("UNBAN")}
          >
            <CheckCircle2 className="size-3.5 text-muted-foreground" />
            Unban user
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem
              className="gap-2 rounded-lg text-sm"
              onClick={() => onModerate("BAN")}
            >
              <Ban className="size-3.5 text-muted-foreground" />
              Ban user
            </DropdownMenuItem>
            {suspended ? (
              <DropdownMenuItem
                className="gap-2 rounded-lg text-sm"
                onClick={() => onModerate("UNSUSPEND")}
              >
                <CheckCircle2 className="size-3.5 text-muted-foreground" />
                Unsuspend user
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                className="gap-2 rounded-lg text-sm"
                onClick={() => onModerate("SUSPEND")}
              >
                <Clock3 className="size-3.5 text-muted-foreground" />
                Suspend user
              </DropdownMenuItem>
            )}
          </>
        )}
        <DropdownMenuSeparator className="my-1" />
        <DropdownMenuItem
          className="gap-2 rounded-lg text-sm text-rose-700 focus:bg-rose-50 focus:text-rose-700"
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
          Delete user
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
