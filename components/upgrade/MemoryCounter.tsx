"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

const FREE_MEMORY_LIMIT = 5;

interface MemoryCounterProps {
  /** User's current tier from the Firestore `users/{uid}` doc. */
  tier: string | null;
  /** Number of cross-session memories stored for the user. */
  count: number;
}

export function MemoryCounter({ tier, count }: MemoryCounterProps) {
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (tier !== "free" || count < FREE_MEMORY_LIMIT || notifiedRef.current) {
      return;
    }
    notifiedRef.current = true;
    toast("You've used all 5 cross-session memories. Upgrade to Starter for unlimited memory.", {
      duration: 6000,
    });
  }, [tier, count]);

  if (tier !== "free") return null;

  const used = Math.min(count, FREE_MEMORY_LIMIT);
  const pct = (used / FREE_MEMORY_LIMIT) * 100;
  const isWarning = count === FREE_MEMORY_LIMIT - 1;
  const isFull = count >= FREE_MEMORY_LIMIT;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border p-4",
        isFull
          ? "border-red-400/30 bg-red-400/10"
          : isWarning
            ? "border-amber-400/30 bg-amber-400/10"
            : "border-white/10 bg-white/5"
      )}
    >
      <div className="flex items-center gap-2">
        {isFull ? (
          <CheckCircle2 className="size-4 shrink-0 text-red-300" />
        ) : (
          <AlertTriangle
            className={cn(
              "size-4 shrink-0",
              isWarning ? "text-amber-300" : "text-[#A1A1A1]"
            )}
          />
        )}
        <p
          className={cn(
            "text-sm font-medium",
            isFull
              ? "text-red-200"
              : isWarning
                ? "text-amber-200"
                : "text-white"
          )}
        >
          You&apos;ve used {count}/{FREE_MEMORY_LIMIT} cross-session memories
        </p>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500",
            isFull ? "bg-red-400" : isWarning ? "bg-amber-400" : "bg-[#8B5CF6]"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-xs text-[#A1A1A1]">
        {isFull
          ? "You've used all 5 memories! Upgrade to continue."
          : isWarning
            ? "Almost out! Upgrade for unlimited."
            : "Free plan includes 5 cross-session memories (Beta)."}
      </p>
    </div>
  );
}
