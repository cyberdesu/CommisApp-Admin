"use client";

import { useState } from "react";
import { resolveMediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

export function UserAvatar({
  src,
  name,
  size = "md",
}: {
  src?: string | null;
  name: string;
  size?: "sm" | "md";
}) {
  const safeSrc = resolveMediaUrl(src);
  const [loadFailed, setLoadFailed] = useState(false);
  const sizeClass = size === "sm" ? "size-8" : "size-10";
  const textClass = size === "sm" ? "text-[10px]" : "text-xs";

  if (safeSrc && !loadFailed) {
    return (
      <img
        src={safeSrc}
        alt={name}
        onError={() => setLoadFailed(true)}
        className={cn(sizeClass, "shrink-0 rounded-full object-cover")}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <div
      className={cn(
        sizeClass,
        "flex shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary",
        textClass,
        "font-bold uppercase",
      )}
    >
      {name.charAt(0)}
    </div>
  );
}
