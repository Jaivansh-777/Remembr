"use client";

import { Gauge } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Quota } from "@/lib/rate-limit";

export function RateLimitBadge({ quota }: { quota: Quota }) {
  const remaining = quota.limit - quota.used;
  const pct = quota.limit > 0 ? quota.used / quota.limit : 0;
  const exhausted = remaining <= 0;
  const low = !exhausted && pct >= 0.8;

  return (
    <span
      title={`${quota.used} of ${quota.limit} messages used today (resets daily)`}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium tabular-nums backdrop-blur-xl",
        exhausted &&
          "border-red-500/40 bg-red-500/10 text-red-300",
        low &&
          !exhausted &&
          "border-amber-500/40 bg-amber-500/10 text-amber-300",
        !low &&
          !exhausted &&
          "border-white/10 bg-white/[0.04] text-[#A1A1A1]"
      )}
    >
      <Gauge className="size-3" />
      <span className="hidden sm:inline">Messages</span>
      {quota.used}/{quota.limit}
      {exhausted ? " — limit reached" : ""}
    </span>
  );
}
