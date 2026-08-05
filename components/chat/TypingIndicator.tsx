"use client";

import { Sparkles } from "lucide-react";

export function TypingIndicator() {
  return (
    <div className="animate-message-in flex items-end gap-2.5">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] shadow-[0_0_12px_rgba(124,58,237,0.4)]">
        <Sparkles className="size-3.5 text-white" />
      </span>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-white/10 bg-[#1A1A1A] px-4 py-3.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 animate-bounce rounded-full bg-[#A1A1A1]"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
