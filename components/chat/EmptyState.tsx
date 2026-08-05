"use client";

import { Sparkles } from "lucide-react";

import { SUGGESTIONS } from "@/lib/chat";

interface EmptyStateProps {
  onPickSuggestion: (text: string) => void;
}

export function EmptyState({ onPickSuggestion }: EmptyStateProps) {
  return (
    <div className="animate-drop-in flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <div className="relative">
        <div className="absolute inset-0 -z-10 animate-pulse rounded-3xl bg-white/10 blur-3xl" />
        <span className="flex size-16 items-center justify-center rounded-3xl border border-white/10 bg-white/5 shadow-[0_0_40px_rgba(255,255,255,0.15)] backdrop-blur-xl">
          <Sparkles className="size-8 text-white" />
        </span>
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Remembr
        </h1>
        <p className="text-sm text-[#A1A1A1]">
          Ask it to remember something — it only keeps what you tell it to.
        </p>
      </div>

      <button
        type="button"
        onClick={() => onPickSuggestion(SUGGESTIONS[0])}
        className="flex h-11 cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white px-5 text-sm font-medium text-[#0A0A0A] shadow-[0_4px_24px_rgba(255,255,255,0.12)] transition-all hover:bg-white/90"
      >
        <Sparkles className="size-4" />
        Start a conversation
      </button>

      <div className="flex max-w-xl flex-wrap items-center justify-center gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onPickSuggestion(suggestion)}
            className="cursor-pointer rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-white/80 backdrop-blur-xl transition-all hover:border-white/30 hover:bg-white/10 hover:text-white sm:text-sm"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
