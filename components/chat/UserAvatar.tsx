"use client";

import { useRouter } from "next/navigation";
import { Database, Folder, LogOut, Settings } from "lucide-react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";

export function UserAvatar() {
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
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label="User menu"
          className="cursor-pointer rounded-full outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-white"
        >
          <Avatar className="ring-2 ring-white/10">
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
          className="animate-dropdown-in z-50 min-w-52 rounded-2xl border border-white/10 bg-[#141414]/90 p-1.5 text-white shadow-2xl backdrop-blur-2xl data-[state=closed]:animate-dropdown-out"
        >
          <DropdownMenuPrimitive.Label className="px-2.5 pt-1.5 pb-1">
            <p className="truncate text-sm font-medium text-white">
              {user?.displayName ?? "Anonymous"}
            </p>
            <p className="truncate text-xs text-[#A1A1A1]">{user?.email}</p>
          </DropdownMenuPrimitive.Label>
          <DropdownMenuPrimitive.Separator className="my-1.5 h-px bg-white/10" />
          <DropdownMenuPrimitive.Item
            onSelect={() => router.push("/settings")}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-white outline-none select-none data-[highlighted]:bg-white/15"
          >
            <Settings className="size-4" />
            Settings
          </DropdownMenuPrimitive.Item>
          <DropdownMenuPrimitive.Item
            onSelect={() => router.push("/settings")}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-white outline-none select-none data-[highlighted]:bg-white/15"
          >
            <Database className="size-4" />
            Memory Dashboard
          </DropdownMenuPrimitive.Item>
          <DropdownMenuPrimitive.Item
            onSelect={() => router.push("/files")}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-white outline-none select-none data-[highlighted]:bg-white/15"
          >
            <Folder className="size-4" />
            Files
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
  );
}
