"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";

function ProfileContent() {
  const { user } = useAuth();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 py-16">
      <Avatar size="lg">
        <AvatarImage
          src={user?.photoURL ?? undefined}
          alt={user?.displayName ?? "User"}
        />
        <AvatarFallback>
          {(user?.displayName ?? user?.email ?? "U").slice(0, 1).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          {user?.displayName ?? "Anonymous"}
        </h1>
        <p className="text-sm text-[#A1A1A1]">{user?.email}</p>
      </div>
      <div className="flex w-full flex-col gap-2 rounded-lg border border-white/10 bg-white/5 p-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-[#A1A1A1]">Tier</span>
          <span className="text-white">Free</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#A1A1A1]">Memory mode</span>
          <span className="text-white">Soulmate</span>
        </div>
      </div>
      <Button asChild className="bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] hover:opacity-90">
        <a href="/chat">Back to chat</a>
      </Button>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
