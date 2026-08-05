"use client";

import { RotateCcw, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

function FailedContent() {
  const params = useSearchParams();
  const paymentId = params.get("paymentId");
  const reason = params.get("reason");

  const message =
    reason === "timeout"
      ? "The 30-second verification window closed before we could confirm your payment."
      : "We couldn't verify your payment. Double-check the amount and UPI ID, then try again.";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <span className="flex size-16 items-center justify-center rounded-full border border-white/20 bg-white/10">
        <X className="size-8 text-white" />
      </span>
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-white">
          Payment not verified
        </h1>
        <p className="text-sm text-[#A1A1A1]">{message}</p>
      </div>

      {paymentId && (
        <p className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-[#A1A1A1]">
          Ref {paymentId.slice(0, 8)}…
        </p>
      )}

      <div className="flex w-full flex-col gap-2">
        <a
          href="/upgrade"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#0A0A0A] transition-opacity hover:opacity-90"
        >
          <RotateCcw className="size-4" />
          Try again
        </a>
        <a
          href="mailto:support@remembr.dev?subject=Payment%20not%20verified"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          Contact support
        </a>
      </div>
    </main>
  );
}

export default function FailedPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={null}>
        <FailedContent />
      </Suspense>
    </ProtectedRoute>
  );
}
