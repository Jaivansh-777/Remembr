"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const LABELS = ["Thinking", "Working", "Generating", "Remembering"];

export function TypingIndicator() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % LABELS.length);
    }, 1100);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="animate-message-in flex items-end gap-2">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 shadow-[0_0_14px_rgba(255,255,255,0.15)] backdrop-blur-xl sm:size-8">
        <Sparkles className="size-4 text-white" />
      </span>
      <div className="flex items-center gap-2.5 rounded-2xl rounded-bl-md border border-white/10 bg-[#1A1A1A]/70 px-4 py-3.5 shadow-[0_4px_24px_rgba(0,0,0,0.3)] backdrop-blur-xl">
        <span
          key={index}
          className="animate-drop-in text-sm font-medium text-white/90"
        >
          {LABELS[index]}
        </span>
        <span className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-1.5 rounded-full bg-[#A1A1A1]"
              style={{
                animation: `typing-dot 1.2s ease-in-out infinite`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
