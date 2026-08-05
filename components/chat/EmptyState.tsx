"use client";

import { Sparkles } from "lucide-react";

import { SUGGESTIONS } from "@/lib/chat";

interface EmptyStateProps {
  onPickSuggestion: (text: string) => void;
}

export function EmptyState({ onPickSuggestion }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <div className="relative">
        <div className="absolute inset-0 -z-10 animate-pulse rounded-3xl bg-[#7C3AED]/25 blur-3xl" />
        <span className="flex size-16 items-center justify-center rounded-3xl border border-white/10 bg-[#7C3AED]/90 shadow-[0_0_40px_rgba(124,58,237,0.5)]">
          <Sparkles className="size-8 text-white" />
        </span>
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          🧠 Remembr
        </h1>
        <p className="text-sm text-[#A1A1A1]">
          Your AI remembers everything. Start a conversation.
        </p>
      </div>

      <button
        type="button"
        onClick={() => onPickSuggestion(SUGGESTIONS[0])}
        className="flex h-11 cursor-pointer items-center gap-2 rounded-full border border-[#7C3AED]/40 bg-[#7C3AED]/15 px-5 text-sm font-medium text-[#E9D5FF] backdrop-blur-xl transition-all hover:border-[#7C3AED]/70 hover:bg-[#7C3AED]/25 hover:text-white"
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
            className="cursor-pointer rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-[#C4B5FD] backdrop-blur-xl transition-all hover:border-[#7C3AED]/50 hover:bg-[#7C3AED]/10 hover:text-white sm:text-sm"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
