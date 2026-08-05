"use client";

import { useRouter } from "next/navigation";
import {
  Database,
  LogOut,
  Menu,
  MessageSquarePlus,
  Settings,
  Sparkles,
} from "lucide-react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MemoryToggle } from "@/components/chat/MemoryToggle";
import { RateLimitBadge } from "@/components/chat/RateLimitBadge";
import { useAuth } from "@/lib/auth-context";
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
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/");
    } catch {
      toast.error("Could not sign out. Please try again.");
    }
  };

  return (
    <header className="border-b border-white/10 bg-[#0A0A0A]/80 backdrop-blur-md">
      <div className="mx-auto grid h-14 w-full max-w-5xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Toggle sidebar"
            onClick={onToggleSidebar}
            className="flex size-9 cursor-pointer items-center justify-center rounded-xl text-[#A1A1A1] transition-colors hover:bg-white/5 hover:text-white md:hidden"
          >
            <Menu className="size-4.5" />
          </button>
          <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] shadow-[0_0_14px_rgba(124,58,237,0.5)]">
            <Sparkles className="size-4 text-white" />
          </span>
          <span className="hidden bg-gradient-to-r from-[#C4B5FD] via-[#8B5CF6] to-[#7C3AED] bg-clip-text text-lg font-semibold tracking-tight text-transparent sm:inline">
            Remembr
          </span>
        </div>

        <div className="flex items-center gap-2">
          <MemoryToggle value={mode} onChange={onModeChange} />
        </div>

        <div className="flex items-center justify-end gap-2">
          <RateLimitBadge quota={quota} />
          <DropdownMenuPrimitive.Root>
            <DropdownMenuPrimitive.Trigger asChild>
              <button
                type="button"
                aria-label="User menu"
                className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
              >
                <Avatar>
                  <AvatarImage
                    src={user?.photoURL ?? undefined}
                    alt={user?.displayName ?? "User"}
                  />
                  <AvatarFallback>
                    {(user?.displayName ?? user?.email ?? "U")
                      .slice(0, 1)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuPrimitive.Trigger>
            <DropdownMenuPrimitive.Portal>
              <DropdownMenuPrimitive.Content
                sideOffset={8}
                align="end"
                className="animate-dropdown-in z-50 min-w-52 rounded-xl border border-white/10 bg-[#1A1A1A]/95 p-1.5 text-white shadow-2xl backdrop-blur-md data-[state=closed]:animate-dropdown-out"
              >
                <DropdownMenuPrimitive.Label className="px-2.5 pt-1.5 pb-1">
                  <p className="text-sm font-medium text-white">
                    {user?.displayName ?? "Anonymous"}
                  </p>
                  <p className="truncate text-xs text-[#A1A1A1]">
                    {user?.email}
                  </p>
                </DropdownMenuPrimitive.Label>
                <DropdownMenuPrimitive.Separator className="my-1.5 h-px bg-white/10" />
                <DropdownMenuPrimitive.Item
                  onSelect={onNewChat}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-white outline-none select-none data-[highlighted]:bg-[#7C3AED]/20 data-[highlighted]:text-white"
                >
                  <MessageSquarePlus className="size-4" />
                  New conversation
                </DropdownMenuPrimitive.Item>
                <DropdownMenuPrimitive.Item
                  onSelect={() => toast.info("Settings coming soon")}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-white outline-none select-none data-[highlighted]:bg-[#7C3AED]/20 data-[highlighted]:text-white"
                >
                  <Settings className="size-4" />
                  Settings
                </DropdownMenuPrimitive.Item>
                <DropdownMenuPrimitive.Item
                  onSelect={() => toast.info("Memory Dashboard coming soon")}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-white outline-none select-none data-[highlighted]:bg-[#7C3AED]/20 data-[highlighted]:text-white"
                >
                  <Database className="size-4" />
                  Memory Dashboard
                </DropdownMenuPrimitive.Item>
                <DropdownMenuPrimitive.Separator className="my-1.5 h-px bg-white/10" />
                <DropdownMenuPrimitive.Item
                  onSelect={handleSignOut}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-red-400 outline-none select-none data-[highlighted]:bg-red-500/15 data-[highlighted]:text-red-300"
                >
                  <LogOut className="size-4" />
                  Sign Out
                </DropdownMenuPrimitive.Item>
              </DropdownMenuPrimitive.Content>
            </DropdownMenuPrimitive.Portal>
          </DropdownMenuPrimitive.Root>
        </div>
      </div>
    </header>
  );
}
