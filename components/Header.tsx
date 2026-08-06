"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Sparkles, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";

export function Header() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (pathname?.startsWith("/chat")) {
    return null;
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/");
    } catch {
      toast.error("Could not sign out. Please try again.");
    }
  };

  return (
    <header
      className="animate-drop-in sticky top-0 z-50 border-b border-white/10 bg-[#0A0A0A]/70 backdrop-blur-md"
      style={{ animationDelay: "0.05s" }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white"
        >
          <span className="flex size-7 items-center justify-center rounded-lg border border-white/15 bg-white/10 backdrop-blur-xl">
            <Sparkles className="size-4 text-white" />
          </span>
          Remembr
        </Link>

        <div className="flex items-center gap-2">
          {/* TEMP: upgrade section disabled */}
          {/* <Link
            href="/upgrade"
            className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/10 sm:flex"
          >
            <Sparkles className="size-3.5" />
            Upgrade
          </Link> */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <Avatar size="sm">
                    <AvatarImage
                      src={user.photoURL ?? undefined}
                      alt={user.displayName ?? "User"}
                    />
                    <AvatarFallback>
                      {(user.displayName ?? user.email ?? "U")
                        .slice(0, 1)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="text-sm font-medium text-white">
                    {user.displayName ?? "Anonymous"}
                  </p>
                  <p className="text-xs text-[#A1A1A1]">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {/* TEMP: upgrade section disabled */}
                {/* <DropdownMenuItem asChild>
                  <Link
                    href="/upgrade"
                    className="flex cursor-pointer items-center gap-2"
                  >
                    <Sparkles className="size-4" />
                    Upgrade plan
                  </Link>
                </DropdownMenuItem> */}
                <DropdownMenuItem asChild>
                  <Link
                    href="/profile"
                    className="flex cursor-pointer items-center gap-2"
                  >
                    <UserRound className="size-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={handleSignOut}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <LogOut className="size-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              asChild
              variant="ghost"
              className="text-white hover:bg-white/10"
            >
              <Link href="/#signin">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
