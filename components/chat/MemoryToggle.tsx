"use client";

import { toast } from "sonner";

import { MEMORY_MODES, type MemoryMode } from "@/lib/chat";
import { cn } from "@/lib/utils";

interface MemoryToggleProps {
  value: MemoryMode;
  onChange: (mode: MemoryMode) => void;
}

export function MemoryToggle({ value, onChange }: MemoryToggleProps) {
  const activeIndex = MEMORY_MODES.findIndex((mode) => mode.id === value);

  const handleChange = (mode: MemoryMode) => {
    if (mode === value) return;
    onChange(mode);
    const option = MEMORY_MODES.find((m) => m.id === mode);
    toast(`${option?.emoji} Switched to ${option?.label} mode`, {
      description: option?.hint,
    });
  };

  return (
    <div
      role="radiogroup"
      aria-label="Memory mode"
      className="relative grid grid-cols-3 items-center rounded-full border border-white/10 bg-[#1A1A1A] p-1"
    >
      <span
        aria-hidden
        className="absolute top-1 bottom-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-full bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] shadow-[0_0_16px_rgba(124,58,237,0.45)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      />
      {MEMORY_MODES.map((mode) => {
        const active = mode.id === value;
        return (
          <button
            key={mode.id}
            type="button"
            role="radio"
            aria-checked={active}
            title={`${mode.label} — ${mode.hint}`}
            onClick={() => handleChange(mode.id)}
            className={cn(
              "relative z-10 flex cursor-pointer items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-medium whitespace-nowrap transition-colors duration-200 sm:px-3",
              active
                ? "text-white"
                : "text-[#A1A1A1] hover:text-white"
            )}
          >
            <span className="text-sm leading-none">{mode.emoji}</span>
            <span className="hidden sm:inline">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}
