import { Ban, BadgeCheck, CheckCircle2, Clock3, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserItem } from "../_lib/types";

export function VerificationStack({
  user,
  suspended,
}: {
  user: UserItem;
  suspended: boolean;
}) {
  return (
    <div className="flex flex-col items-start gap-1">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
          user.verified
            ? "bg-emerald-100 text-emerald-800"
            : "bg-muted text-muted-foreground",
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
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-800">
          <BadgeCheck className="size-3" />
          Artist
        </span>
      )}
      {user.isBanned && (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800">
          <Ban className="size-3" />
          Banned
        </span>
      )}
      {suspended && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
          <Clock3 className="size-3" />
          Suspended
        </span>
      )}
    </div>
  );
}
