"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { PLANS } from "@/lib/validations/payment";

interface UpgradePromptProps {
  open: boolean;
  onClose: () => void;
}

/** Shown when a free-tier user hits the cross-session memory cap. */
export function UpgradePrompt({ open, onClose }: UpgradePromptProps) {
  const router = useRouter();
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111111] p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex size-10 items-center justify-center rounded-xl bg-[#8B5CF6]/15 text-[#A78BFA]">
          <Sparkles className="size-5" />
        </div>
        <h2 className="mt-4 text-lg font-semibold tracking-tight text-white">
          You&apos;ve used all your free memories
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[#A1A1A1]">
          Upgrade to {PLANS.starter.label} (₹{PLANS.starter.priceMonthly}/month)
          for unlimited cross-session memory — I&apos;ll never forget a thing.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => router.push("/upgrade")}
            className="h-11 w-full rounded-xl bg-white text-sm font-semibold text-[#0A0A0A] transition-opacity hover:opacity-90"
          >
            Upgrade to {PLANS.starter.shortLabel}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-full rounded-xl border border-white/10 bg-white/5 text-sm font-medium text-[#A1A1A1] transition-colors hover:bg-white/10 hover:text-white"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
