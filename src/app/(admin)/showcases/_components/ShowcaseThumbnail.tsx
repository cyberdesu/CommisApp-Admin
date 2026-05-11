"use client";

import { useMemo, useState } from "react";
import { resolveMediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { getThumbPalette, hashSeed } from "../_lib/helpers";

export function ShowcaseThumbnail({
  src,
  alt,
  seed,
  className,
}: {
  src?: string | null;
  alt: string;
  seed: string;
  className?: string;
}) {
  const safeSrc = src ? resolveMediaUrl(src) : null;
  const [loadFailed, setLoadFailed] = useState(false);
  const palette = useMemo(() => getThumbPalette(hashSeed(seed)), [seed]);

  if (safeSrc && !loadFailed) {
    return (
      <img
        src={safeSrc}
        alt={alt}
        onError={() => setLoadFailed(true)}
        loading="lazy"
        decoding="async"
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }

  return (
    <div
      className={cn("h-full w-full", className)}
      style={{
        background: `linear-gradient(135deg, ${palette.c}, ${palette.b})`,
      }}
    >
      <svg
        viewBox="0 0 200 150"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full opacity-55"
      >
        <defs>
          <radialGradient id={`rg-${seed}`} cx="30%" cy="35%">
            <stop offset="0%" stopColor={palette.a} stopOpacity="0.75" />
            <stop offset="100%" stopColor={palette.c} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="200" height="150" fill={`url(#rg-${seed})`} />
        <path
          d="M0 110 Q50 80 100 100 T200 90 L200 150 L0 150 Z"
          fill={palette.b}
          opacity="0.75"
        />
        <path
          d="M0 130 Q60 110 120 125 T200 120 L200 150 L0 150 Z"
          fill={palette.c}
        />
        <circle cx="160" cy="38" r="14" fill={palette.d} opacity="0.85" />
      </svg>
    </div>
  );
}
