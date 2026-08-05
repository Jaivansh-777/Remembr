"use client";

import { Menu, Sparkles } from "lucide-react";

import { MemoryBadge } from "@/components/chat/MemoryBadge";
import { RateLimitBadge } from "@/components/chat/RateLimitBadge";
import { UserAvatar } from "@/components/chat/UserAvatar";
import { ProjectHeader } from "@/components/projects/ProjectHeader";
import type { MemoryMode } from "@/lib/chat";
import type { ProjectDoc } from "@/lib/projects";
import type { Quota } from "@/lib/rate-limit";
import { cn } from "@/lib/utils";

interface ChatHeaderProps {
  mode: MemoryMode;
  onModeChange: (mode: MemoryMode) => void;
  onNewChat: () => void;
  onToggleSidebar: () => void;
  sidebarMinimized?: boolean;
  quota: Quota;
  project?: ProjectDoc | null;
  onOpenInvite?: () => void;
}

export function ChatHeader({
  mode,
  onModeChange,
  onNewChat,
  onToggleSidebar,
  sidebarMinimized,
  quota,
  project,
  onOpenInvite,
}: ChatHeaderProps) {
  return (
    <header className="animate-drop-in sticky top-0 z-30 border-b border-white/10 bg-[#0A0A0A]/70 backdrop-blur-2xl">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-3 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            aria-label="Toggle sidebar"
            onClick={onToggleSidebar}
            className={cn(
              "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-[#A1A1A1] transition-colors hover:bg-white/5 hover:text-white",
              sidebarMinimized ? "md:flex" : "md:hidden"
            )}
          >
            <Menu className="size-5" />
          </button>
          {project ? (
            <ProjectHeader project={project} onInvite={onOpenInvite ?? (() => {})} />
          ) : (
            <button
              type="button"
              onClick={onNewChat}
              aria-label="New conversation"
              className="flex min-w-0 cursor-pointer items-center gap-2"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10 backdrop-blur-xl">
                <Sparkles className="size-4 text-white" />
              </span>
              <span className="truncate text-[15px] font-semibold tracking-tight text-white">
                Remembr
              </span>
            </button>
          )}
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
