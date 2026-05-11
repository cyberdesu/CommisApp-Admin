"use client";

import { useState } from "react";
import { resolveMediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { AVATAR_GRADIENTS } from "../_lib/helpers";
import type { UserItem } from "../_lib/types";

const SIZE_MAP = {
  sm: "size-8 text-[11px] rounded-lg",
  md: "size-9 text-xs rounded-[10px]",
  lg: "size-20 text-2xl rounded-2xl",
} as const;

export function UserAvatar({
  user,
  className,
  size = "md",
}: {
  user: Pick<UserItem, "avatar" | "name" | "username">;
  className?: string;
  size?: keyof typeof SIZE_MAP;
}) {
  const avatarUrl = resolveMediaUrl(user.avatar);
  const [loadFailed, setLoadFailed] = useState(false);

  const initials = (
    user.name?.trim()?.[0] ||
    user.username?.trim()?.[0] ||
    "U"
  ).toUpperCase();
  const initials2 = (
    user.name?.trim()?.split(/\s+/)?.[1]?.[0] ||
    user.username?.trim()?.[1] ||
    ""
  ).toUpperCase();

  const sizeClass = SIZE_MAP[size];

  if (avatarUrl && !loadFailed) {
    return (
      <img
        src={avatarUrl}
        alt={user.name ?? user.username}
        onError={() => setLoadFailed(true)}
        className={cn(
          "shrink-0 border border-black/5 object-cover",
          sizeClass,
          className,
        )}
      />
    );
  }

  const colorIdx =
    (user.username?.charCodeAt(0) ?? 0) % AVATAR_GRADIENTS.length;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center bg-gradient-to-br font-semibold text-white",
        AVATAR_GRADIENTS[colorIdx],
        sizeClass,
        className,
      )}
    >
      {initials}
      {initials2}
    </div>
  );
}
