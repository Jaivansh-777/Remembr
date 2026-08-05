"use client";

import { Clock, HardDrive } from "lucide-react";

import { useFiles } from "@/lib/hooks/use-files";
import { formatBytes } from "@/lib/file-types";
import { cn } from "@/lib/utils";

interface StorageMeterProps {
  userId: string | null;
  compact?: boolean;
}

export function StorageMeter({ userId, compact }: StorageMeterProps) {
  const { quota, tier } = useFiles(userId);

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-[#A1A1A1]">
          <HardDrive className="size-3.5" />
          <span>
            <span className="font-medium text-white">{formatBytes(quota.used)}</span>
            {" / "}
            {formatBytes(quota.limit)}
          </span>
          <span className="rounded-full border border-white/15 bg-white/10 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-white/80">
            {tier}
          </span>
        </div>
        <span
          className={cn(
            "text-xs tabular-nums",
            quota.nearLimit ? "text-red-300" : "text-[#A1A1A1]"
          )}
        >
          {Math.round(quota.percent * 100)}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            quota.nearLimit ? "bg-red-400" : "bg-white"
          )}
          style={{ width: `${Math.min(100, quota.percent * 100)}%` }}
        />
      </div>
      {!compact ? (
        <div className="flex items-center gap-2 text-[11px] text-[#A1A1A1]">
          <Clock className="size-3" />
          <span>
            {quota.expiryDays
              ? `Free files expire after ${quota.expiryDays} days.`
              : "Files are stored indefinitely on this plan."}
          </span>
        </div>
      ) : null}
    </div>
  );
}
