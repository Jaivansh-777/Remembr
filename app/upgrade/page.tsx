"use client";

import { ArrowLeft, BadgeCheck, Check, Crown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  BillingForm,
  type CreatedPayment,
} from "@/components/payment/BillingForm";
import { PaymentQR } from "@/components/payment/PaymentQR";
import { CURRENCY, PLANS, UPI_ID, type PlanId } from "@/lib/validations/payment";
import { cn } from "@/lib/utils";

function UpgradeContent() {
  const router = useRouter();
  const [plan, setPlan] = useState<PlanId>("pro");
  const [payment, setPayment] = useState<CreatedPayment | null>(null);

  const handlePaymentCreated = (created: CreatedPayment) => {
    setPayment(created);
  };

  const handleSelectPlan = (next: PlanId) => {
    if (next === plan) return;
    setPlan(next);
    setPayment(null);
  };

  const handlePaid = () => {
    if (payment) {
      router.push(`/payment/processing?paymentId=${payment.paymentId}`);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="flex items-center gap-3">
        <a
          href="/chat"
          className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#A1A1A1] transition-colors hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="size-4" />
        </a>
        <div className="flex flex-col">
          <h1 className="text-xl font-semibold tracking-tight text-white">
            Upgrade Remembr
          </h1>
          <p className="text-sm text-[#A1A1A1]">
            One-time UPI payment · Verified manually by our team
          </p>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(Object.keys(PLANS) as PlanId[]).map((id) => {
          const config = PLANS[id];
          const selected = plan === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleSelectPlan(id)}
              className={cn(
                "flex flex-col gap-3 rounded-2xl border p-5 text-left transition-colors",
                selected
                  ? "border-white/60 bg-white/10"
                  : "border-white/10 bg-white/5 hover:bg-white/[0.07]"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {id === "pro" ? (
                    <Crown className="size-4 text-white" />
                  ) : (
                    <BadgeCheck className="size-4 text-white" />
                  )}
                  <span className="text-sm font-semibold text-white">
                    {config.label}
                  </span>
                </div>
                <span
                  className={cn(
                    "size-4 rounded-full border",
                    selected ? "border-white bg-white" : "border-white/30"
                  )}
                >
                  {selected && (
                    <Check className="size-3.5 -translate-x-px text-[#0A0A0A]" />
                  )}
                </span>
              </div>
              <p className="text-xs text-[#A1A1A1]">{config.description}</p>
              <p className="text-lg font-semibold text-white">
                {CURRENCY}{" "}
                <span className="text-2xl">{config.amount.toLocaleString("en-IN")}</span>
                <span className="text-xs font-normal text-[#A1A1A1]"> one-time</span>
              </p>
              <ul className="flex flex-col gap-1">
                {config.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-1.5 text-xs text-[#A1A1A1]">
                    <Check className="mt-0.5 size-3 shrink-0 text-white" />
                    {feature}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-5">
        {payment ? (
          <PaymentQR
            upiId={UPI_ID}
            amount={payment.amount}
            note={PLANS[payment.plan].note}
            payeeName="Remembr"
            onPaid={handlePaid}
          />
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-semibold text-white">Billing details</h2>
              <p className="text-xs text-[#A1A1A1]">
                Required for your receipt & verification for{" "}
                <span className="text-white">{PLANS[plan].shortLabel}</span>
              </p>
            </div>
            <BillingForm plan={plan} onPaymentCreated={handlePaymentCreated} />
          </>
        )}
      </section>

      <p className="text-center text-xs text-[#A1A1A1]">
        Already upgraded?{" "}
        <a href="/settings" className="text-white underline-offset-4 hover:underline">
          Check your plan
        </a>
      </p>
    </main>
  );
}

export default function UpgradePage() {
  return (
    <ProtectedRoute>
      <UpgradeContent />
    </ProtectedRoute>
  );
}
