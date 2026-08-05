"use client";

import { Brain, ChevronDown } from "lucide-react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { toast } from "sonner";

import { MEMORY_MODES, type MemoryMode } from "@/lib/chat";
import { cn } from "@/lib/utils";

interface MemoryBadgeProps {
  value: MemoryMode;
  onChange: (mode: MemoryMode) => void;
}

export function MemoryBadge({ value, onChange }: MemoryBadgeProps) {
  const current =
    MEMORY_MODES.find((mode) => mode.id === value) ?? MEMORY_MODES[1];

  const handleSelect = (mode: MemoryMode) => {
    if (mode === value) return;
    onChange(mode);
    const option = MEMORY_MODES.find((m) => m.id === mode);
    toast(`${option?.emoji} Switched to ${option?.label} mode`, {
      description: option?.hint,
    });
  };

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label="Memory mode"
          title={`Memory mode: ${current.label} — ${current.hint}`}
          className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-white backdrop-blur-xl transition-colors hover:border-white/30 hover:bg-white/[0.08]"
        >
          <Brain className="size-3.5 text-white" />
          {current.label}
          <ChevronDown className="size-3 text-[#A1A1A1]" />
        </button>
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          sideOffset={8}
          align="center"
          className="animate-dropdown-in z-50 min-w-48 rounded-2xl border border-white/10 bg-[#141414]/90 p-1.5 text-white shadow-2xl backdrop-blur-2xl data-[state=closed]:animate-dropdown-out"
        >
          {MEMORY_MODES.map((mode) => (
            <DropdownMenuPrimitive.Item
              key={mode.id}
              onSelect={() => handleSelect(mode.id)}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm outline-none select-none data-[highlighted]:bg-white/15",
                value === mode.id && "bg-white/10 text-white"
              )}
            >
              <span className="text-base leading-none">{mode.emoji}</span>
              <span className="flex flex-col">
                <span className="font-medium text-white">{mode.label}</span>
                <span className="text-[11px] text-[#A1A1A1]">{mode.hint}</span>
              </span>
            </DropdownMenuPrimitive.Item>
          ))}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}
