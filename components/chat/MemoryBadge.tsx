"use client";

import { Heart } from "lucide-react";

import { MEMORY_MODES } from "@/lib/chat";

export function MemoryBadge() {
  const mode = MEMORY_MODES[0];
  return (
    <span
      title={`${mode.label} — ${mode.hint}`}
      className="flex h-8 cursor-default items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-white backdrop-blur-xl"
    >
      <Heart className="size-3.5 fill-red-400 text-red-400" />
      {mode.label}
    </span>
  );
}
