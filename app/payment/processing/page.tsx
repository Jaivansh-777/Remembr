"use client";

import { doc, onSnapshot } from "firebase/firestore";
import { AlertTriangle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { toPaymentDoc, type PaymentDoc } from "@/lib/payments";
import { CURRENCY } from "@/lib/validations/payment";

const PROCESSING_SECONDS = 30;

function ProcessingContent() {
  const router = useRouter();
  const params = useSearchParams();
  const paymentId = params.get("paymentId");
  const { user } = useAuth();

  const [payment, setPayment] = useState<PaymentDoc | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(PROCESSING_SECONDS);
  const navigatedRef = useRef(false);

  const navigate = useCallback(
    (path: string) => {
      if (navigatedRef.current) return;
      navigatedRef.current = true;
      router.replace(path);
    },
    [router]
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (secondsLeft > 0) return;
    if (navigatedRef.current || !paymentId || !user) return;
    if (payment && payment.status !== "pending") return;
    void (async () => {
      try {
        const token = await user.getIdToken();
        await fetch(`/api/payments/timeout/${paymentId}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (error) {
        console.error("[processing] timeout call failed:", error);
      }
      navigate(`/payment/failed?paymentId=${paymentId}&reason=timeout`);
    })();
  }, [secondsLeft, paymentId, user, payment, navigate]);

  useEffect(() => {
    if (!paymentId || !db) return;
    const unsub = onSnapshot(
      doc(db, "payments", paymentId),
      (snap) => {
        if (!snap.exists()) return;
        const next = toPaymentDoc(snap.id, snap.data() as Record<string, unknown>);
        setPayment(next);
        if (next.status === "verified") {
          navigate(`/payment/success?paymentId=${paymentId}`);
        } else if (next.status === "failed" || next.status === "timeout") {
          navigate(`/payment/failed?paymentId=${paymentId}&reason=${next.status}`);
        }
      },
      (error) => {
        console.error("[processing] payment watch failed:", error);
      }
    );
    return () => unsub();
  }, [paymentId, navigate]);

  if (!paymentId) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4">
        <AlertTriangle className="size-8 text-[#A1A1A1]" />
        <p className="text-sm text-[#A1A1A1]">No payment reference found.</p>
        <a
          href="/upgrade"
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#0A0A0A]"
        >
          Back to upgrade
        </a>
      </main>
    );
  }

  const progress = Math.max(0, (secondsLeft / PROCESSING_SECONDS) * 100);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="size-10 animate-spin rounded-full border-[3px] border-white/20 border-t-white" />
        <h1 className="text-lg font-semibold tracking-tight text-white">
          Checking your payment…
        </h1>
        <p className="text-sm text-[#A1A1A1]">
          Keep this tab open. We&apos;ll redirect you automatically once it&apos;s
          verified.
        </p>
      </div>

      <div className="flex w-full flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#A1A1A1]">Time remaining</span>
          <span className="font-medium text-white">{secondsLeft}s</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-white transition-[width] duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        <dl className="mt-3 flex flex-col gap-1.5 text-sm">
          {payment && (
            <>
              <div className="flex justify-between">
                <dt className="text-[#A1A1A1]">Amount</dt>
                <dd className="font-medium text-white">
                  {CURRENCY} {payment.amount.toLocaleString("en-IN")}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#A1A1A1]">Plan</dt>
                <dd className="font-medium text-white">{payment.planLabel}</dd>
              </div>
            </>
          )}
          <div className="flex justify-between">
            <dt className="text-[#A1A1A1]">Reference</dt>
            <dd className="font-mono text-xs text-white">
              {paymentId.slice(0, 8)}…
            </dd>
          </div>
        </dl>
      </div>

      <p className="text-center text-xs text-[#A1A1A1]">
        Made a mistake?{" "}
        <a href="/upgrade" className="text-white underline-offset-4 hover:underline">
          Start over
        </a>
      </p>
    </main>
  );
}

export default function ProcessingPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={null}>
        <ProcessingContent />
      </Suspense>
    </ProtectedRoute>
  );
}
