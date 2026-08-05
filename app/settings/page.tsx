"use client";

import { ArrowLeft } from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MemoryDashboard } from "@/components/settings/MemoryDashboard";
import { StorageMeter } from "@/components/files/StorageMeter";
import { MemoryToggle } from "@/components/chat/MemoryToggle";
import { RateLimitBadge } from "@/components/chat/RateLimitBadge";
import { useAuth } from "@/lib/auth-context";
import { useQuota } from "@/lib/hooks/use-quota";
import { MEMORY_MODE_LABEL, type MemoryMode } from "@/lib/chat";
import { setMemoryMode } from "@/lib/firebase/firestore";

function SettingsContent() {
  const { user } = useAuth();
  const { quota, mode } = useQuota(user?.uid ?? null);

  const handleModeChange = (nextMode: MemoryMode) => {
    if (user) void setMemoryMode(user.uid, nextMode);
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a
            href="/chat"
            className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#A1A1A1] transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="size-4" />
          </a>
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold tracking-tight text-white">
              Settings
            </h1>
            <p className="text-sm text-[#A1A1A1]">
              Manage your memory, quota, and account
            </p>
          </div>
        </div>
        <RateLimitBadge quota={quota} />
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-white">Memory mode</h2>
          <p className="text-xs text-[#A1A1A1]">
            Current mode:{" "}
            <span className="font-medium text-[#C4B5FD]">
              {MEMORY_MODE_LABEL[mode]}
            </span>
          </p>
        </div>
        <MemoryToggle
          value={mode}
          onChange={handleModeChange}
        />
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-white">File storage</h2>
          <p className="text-xs text-[#A1A1A1]">
            Space used by uploaded files and documents
          </p>
        </div>
        <StorageMeter userId={user?.uid ?? null} />
        <a
          href="/files"
          className="mt-1 flex w-fit cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/10"
        >
          Manage files
        </a>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-white">Memory dashboard</h2>
          <p className="text-xs text-[#A1A1A1]">
            Everything Remembr remembers about you, in one place
          </p>
        </div>
        <MemoryDashboard />
      </section>
    </main>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}
