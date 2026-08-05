"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  BillingForm,
  type CreatedPayment,
} from "@/components/payment/BillingForm";
import { PaymentQR } from "@/components/payment/PaymentQR";
import { MemoryCounter } from "@/components/upgrade/MemoryCounter";
import { PlanCard } from "@/components/upgrade/PlanCard";
import { useAuth } from "@/lib/auth-context";
import { watchMemories, watchUser } from "@/lib/firebase/firestore";
import { CURRENCY, PLANS, UPI_ID, type PlanId } from "@/lib/validations/payment";

function UpgradeContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [tier, setTier] = useState<string | null>(null);
  const [memoryCount, setMemoryCount] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [payment, setPayment] = useState<CreatedPayment | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    return watchUser(user.uid, (data) =>
      setTier((data?.tier as string) ?? "free")
    );
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    return watchMemories(user.uid, (items) => setMemoryCount(items.length));
  }, [user?.uid]);

  const handleSelectPlan = (planId: PlanId) => {
    if (planId === "free" || planId === selectedPlan) return;
    setSelectedPlan(planId);
    setPayment(null);
  };

  const handlePaid = () => {
    if (payment) {
      router.push(`/payment/processing?paymentId=${payment.paymentId}`);
    }
  };

  const planIsCurrent = (planId: PlanId): boolean => {
    if (planId === "free") return tier === null || tier === "free";
    return tier === planId;
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
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
            Pay once via UPI · verified manually by our team
          </p>
        </div>
      </div>

      <MemoryCounter tier={tier} count={memoryCount} />

      <section className="grid grid-cols-1 gap-6 pt-3 md:grid-cols-3">
        {(Object.keys(PLANS) as PlanId[]).map((planId) => (
          <PlanCard
            key={planId}
            planId={planId}
            isCurrent={planIsCurrent(planId)}
            selected={selectedPlan === planId}
            onSelect={() => handleSelectPlan(planId)}
          />
        ))}
      </section>

      {selectedPlan && (
        <section className="mx-auto flex w-full max-w-md flex-col gap-4">
          {payment ? (
            <>
              <PaymentQR
                upiId={UPI_ID}
                amount={PLANS[selectedPlan].priceMonthly}
                note={PLANS[selectedPlan].note}
                payeeName="Remembr"
                onPaid={handlePaid}
              />
              <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
                <h3 className="text-sm font-semibold text-white">
                  Payment summary
                </h3>
                <dl className="flex flex-col gap-1.5">
                  <div className="flex justify-between">
                    <dt className="text-[#A1A1A1]">Plan</dt>
                    <dd className="font-medium text-white">
                      {PLANS[selectedPlan].label} · {CURRENCY}{" "}
                      {PLANS[selectedPlan].priceMonthly.toLocaleString("en-IN")}/month
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[#A1A1A1]">Pay now (UPI)</dt>
                    <dd className="font-medium text-white">
                      {CURRENCY} {PLANS[selectedPlan].priceMonthly.toLocaleString("en-IN")}
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
            </>
          ) : (
            <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex flex-col gap-1">
                <h2 className="text-sm font-semibold text-white">
                  Pay for {PLANS[selectedPlan].label}
                </h2>
                <p className="text-xs text-[#A1A1A1]">
                  {CURRENCY} {PLANS[selectedPlan].priceMonthly.toLocaleString("en-IN")}/month
                  {" "}· one-time UPI payment now
                </p>
              </div>
              <BillingForm plan={selectedPlan} onPaymentCreated={setPayment} />
            </div>
          )}
        </section>
      )}
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
