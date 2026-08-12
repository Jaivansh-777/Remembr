"use client";

import { Check } from "lucide-react";

import { MEMORY_MODES } from "@/lib/chat";

export function MemoryToggle() {
  const mode = MEMORY_MODES[0];
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-base leading-none">
        {mode.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">{mode.label} mode</p>
        <p className="text-xs text-[#A1A1A1]">{mode.hint}</p>
      </div>
      <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
        <Check className="size-3" />
        Active
      </span>
    </div>
  );
}
