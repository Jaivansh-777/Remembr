"use client";

import { ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

import type { TrialBlockReason } from "@/lib/trial-protection";
import { PLANS } from "@/lib/validations/payment";

interface BlockedDeviceModalProps {
  open: boolean;
  reason: TrialBlockReason | null;
  onClose: () => void;
}

const COPY: Record<TrialBlockReason, { title: string; body: string }> = {
  device_used: {
    title: "Free trial already used on this device",
    body: "The free trial on this device has already been used. Upgrade to keep chatting with full memory.",
  },
  ip_limit: {
    title: "Too many free accounts on this network",
    body: "This network has reached the limit of free accounts. Upgrade to keep chatting with full memory.",
  },
};

/** Shown when a device/IP is blocked from creating another free trial. */
export function BlockedDeviceModal({
  open,
  reason,
  onClose,
}: BlockedDeviceModalProps) {
  const router = useRouter();
  if (!open || !reason) return null;
  const copy = COPY[reason];

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
        <div className="flex size-10 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
          <ShieldAlert className="size-5" />
        </div>
        <h2 className="mt-4 text-lg font-semibold tracking-tight text-white">
          {copy.title}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[#A1A1A1]">
          {copy.body}
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => router.push("/upgrade")}
            className="h-11 w-full rounded-xl bg-white text-sm font-semibold text-[#0A0A0A] transition-opacity hover:opacity-90"
          >
            Upgrade to {PLANS.starter.shortLabel} · ₹{PLANS.starter.priceMonthly}/month
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-full rounded-xl border border-white/10 bg-white/5 text-sm font-medium text-[#A1A1A1] transition-colors hover:bg-white/10 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
