"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";

function LoadingScreen() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3">
      <span className="size-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      <span className="text-sm text-[#A1A1A1]">Loading…</span>
    </div>
  );
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
