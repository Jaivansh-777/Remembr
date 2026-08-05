"use client";

import { ArrowLeft, Check } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  BillingForm,
  type CreatedPayment,
} from "@/components/payment/BillingForm";
import { PaymentQR } from "@/components/payment/PaymentQR";
import { useAuth } from "@/lib/auth-context";
import { watchUser } from "@/lib/firebase/firestore";
import {
  CURRENCY,
  isPaidPlan,
  PLANS,
  UPI_ID,
  type PlanId,
} from "@/lib/validations/payment";

function CheckoutContent() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useSearchParams();
  const planParam = params.get("plan");
  const plan: PlanId | null = isPaidPlan(planParam) ? planParam : null;

  const [tier, setTier] = useState<string | null>(null);
  const [payment, setPayment] = useState<CreatedPayment | null>(null);

  useEffect(() => {
    if (!plan) router.replace("/upgrade");
  }, [plan, router]);

  useEffect(() => {
    if (!user?.uid) return;
    return watchUser(user.uid, (data) =>
      setTier((data?.tier as string) ?? "free")
    );
  }, [user?.uid]);

  if (!plan) return null;

  const config = PLANS[plan];
  const alreadyOnPlan = tier !== null && tier === plan;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-8">
      <div className="flex items-center gap-3">
        <a
          href="/upgrade"
          className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#A1A1A1] transition-colors hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="size-4" />
        </a>
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-lg font-semibold tracking-tight text-white">
            Pay for {config.label}
          </h1>
          <p className="text-xs text-[#A1A1A1]">
            Pay once via UPI · verified manually by our team
          </p>
        </div>
      </div>

      <div className="animate-drop-in flex items-center justify-between gap-3 rounded-2xl border border-[#7C3AED]/25 bg-[#7C3AED]/10 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-2xl">{config.emoji}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {config.label} · {config.memoryBadge}
            </p>
            <p className="truncate text-xs text-[#A1A1A1]">{config.tagline}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xl font-semibold text-white">
            {CURRENCY} {config.priceMonthly.toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-[#A1A1A1]">/month</p>
        </div>
      </div>

      {alreadyOnPlan ? (
        <div className="animate-dropdown-in flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-white/10 text-white">
            <Check className="size-5" />
          </span>
          <p className="text-sm text-white">
            You&apos;re already on the {config.label} plan 🎉
          </p>
          <button
            type="button"
            onClick={() => router.push("/chat")}
            className="h-11 w-full rounded-xl bg-white text-sm font-semibold text-[#0A0A0A] transition-opacity hover:opacity-90"
          >
            Go to chat
          </button>
        </div>
      ) : payment ? (
        <div className="animate-dropdown-in flex flex-col gap-4">
          <PaymentQR
            upiId={UPI_ID}
            amount={config.priceMonthly}
            note={config.note}
            payeeName="Remembr"
            onPaid={() =>
              router.push(`/payment/processing?paymentId=${payment.paymentId}`)
            }
          />
          <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
            <h3 className="text-sm font-semibold text-white">Payment summary</h3>
            <dl className="flex flex-col gap-1.5">
              <div className="flex justify-between">
                <dt className="text-[#A1A1A1]">Plan</dt>
                <dd className="font-medium text-white">
                  {config.label} · {CURRENCY}{" "}
                  {config.priceMonthly.toLocaleString("en-IN")}/month
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#A1A1A1]">Pay now (UPI)</dt>
                <dd className="font-medium text-white">
                  {CURRENCY} {config.priceMonthly.toLocaleString("en-IN")}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#A1A1A1]">UPI ID</dt>
                <dd className="font-medium text-white">{UPI_ID}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#A1A1A1]">Verification</dt>
                <dd className="text-[#A1A1A1]">Manual · ~1 minute</dd>
              </div>
            </dl>
          </div>
        </div>
      ) : (
        <div className="animate-dropdown-in flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-white">
              Billing details
            </h2>
            <p className="text-xs text-[#A1A1A1]">
              {CURRENCY} {config.priceMonthly.toLocaleString("en-IN")}/month ·
              one-time UPI payment now
            </p>
          </div>
          <BillingForm plan={plan} onPaymentCreated={setPayment} />
        </div>
      )}
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center">
            <div className="size-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          </div>
        }
      >
        <CheckoutContent />
      </Suspense>
    </ProtectedRoute>
  );
}
