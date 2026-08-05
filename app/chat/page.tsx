"use client";

import { MessageSquarePlus } from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";

function ChatContent() {
  const { user } = useAuth();

  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-4 px-4 py-16">
        <div className="flex flex-col items-center gap-3 text-center">
          {user?.photoURL ? (
            <Avatar size="lg">
              <AvatarImage src={user.photoURL} alt={user.displayName ?? "User"} />
              <AvatarFallback>
                {(user.displayName ?? user.email ?? "U").slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : null}
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Welcome back, {user?.displayName?.split(" ")[0] ?? "friend"}
          </h1>
          <p className="max-w-md text-sm text-[#A1A1A1] sm:text-base">
            Your memory is intact. Start a new conversation — Remembr remembers
            everything.
          </p>
        </div>

        <Button className="mt-4 gap-2 bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] px-6 text-base text-white hover:opacity-90">
          <MessageSquarePlus className="size-5" />
          New conversation
        </Button>
      </div>
    </main>
  );
}

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <ChatContent />
    </ProtectedRoute>
  );
}
