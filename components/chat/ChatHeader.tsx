"use client";

import { Menu, Sparkles } from "lucide-react";

import { MemoryBadge } from "@/components/chat/MemoryBadge";
import { RateLimitBadge } from "@/components/chat/RateLimitBadge";
import { UserAvatar } from "@/components/chat/UserAvatar";
import type { MemoryMode } from "@/lib/chat";
import type { Quota } from "@/lib/rate-limit";

interface ChatHeaderProps {
  mode: MemoryMode;
  onModeChange: (mode: MemoryMode) => void;
  onNewChat: () => void;
  onToggleSidebar: () => void;
  quota: Quota;
}

export function ChatHeader({
  mode,
  onModeChange,
  onNewChat,
  onToggleSidebar,
  quota,
}: ChatHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0A0A0A]/70 backdrop-blur-2xl">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-3 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            aria-label="Toggle sidebar"
            onClick={onToggleSidebar}
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-[#A1A1A1] transition-colors hover:bg-white/5 hover:text-white md:hidden"
          >
            <Menu className="size-5" />
          </button>
          <button
            type="button"
            onClick={onNewChat}
            aria-label="New conversation"
            className="flex min-w-0 cursor-pointer items-center gap-2"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#7C3AED]/90 shadow-[0_0_16px_rgba(124,58,237,0.45)]">
              <Sparkles className="size-4 text-white" />
            </span>
            <span className="truncate text-[15px] font-semibold tracking-tight text-white">
              Remembr
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <MemoryBadge value={mode} onChange={onModeChange} />
        </div>

        <div className="flex items-center justify-end gap-2">
          <span className="hidden sm:block">
            <RateLimitBadge quota={quota} />
          </span>
          <UserAvatar />
        </div>
      </div>
    </header>
  );
}
