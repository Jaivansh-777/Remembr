"use client";

import { Check, MessageSquare, Settings } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

function SuccessContent() {
  const params = useSearchParams();
  const paymentId = params.get("paymentId");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <span className="flex size-16 items-center justify-center rounded-full border border-white/20 bg-white/10">
        <Check className="size-8 text-white" />
      </span>
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-white">
          Payment verified — welcome to Pro!
        </h1>
        <p className="text-sm text-[#A1A1A1]">
          Your account has been upgraded. All Pro features are now unlocked.
        </p>
      </div>

      {paymentId && (
        <p className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-[#A1A1A1]">
          Ref {paymentId.slice(0, 8)}…
        </p>
      )}

      <div className="flex w-full flex-col gap-2">
        <a
          href="/chat"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#0A0A0A] transition-opacity hover:opacity-90"
        >
          <MessageSquare className="size-4" />
          Continue chatting
        </a>
        <a
          href="/settings"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          <Settings className="size-4" />
          View my plan
        </a>
      </div>
    </main>
  );
}

export default function SuccessPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={null}>
        <SuccessContent />
      </Suspense>
    </ProtectedRoute>
  );
}
