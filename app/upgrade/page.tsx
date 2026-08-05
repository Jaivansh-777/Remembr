"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MemoryCounter } from "@/components/upgrade/MemoryCounter";
import { PlanCard } from "@/components/upgrade/PlanCard";
import { useAuth } from "@/lib/auth-context";
import { watchMemories, watchUser } from "@/lib/firebase/firestore";
import { PLANS, type PlanId } from "@/lib/validations/payment";

function UpgradeContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [tier, setTier] = useState<string | null>(null);
  const [memoryCount, setMemoryCount] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const redirectingRef = useRef(false);

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
    if (planId === "free" || redirectingRef.current) return;
    if (tier === planId) return;
    setSelectedPlan(planId);
    redirectingRef.current = true;
    setTimeout(() => {
      router.push(`/payment/checkout?plan=${planId}`);
    }, 350);
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
            Pick a plan — you&apos;ll pay securely on the next page
          </p>
        </div>
      </div>

      <MemoryCounter tier={tier} count={memoryCount} />

      <section className="grid grid-cols-1 gap-6 pt-3 md:grid-cols-3">
        {(Object.keys(PLANS) as PlanId[]).map((planId, index) => (
          <div
            key={planId}
            className="animate-dropdown-in"
            style={{ animationDelay: `${index * 90}ms` }}
          >
            <PlanCard
              planId={planId}
              isCurrent={planIsCurrent(planId)}
              selected={selectedPlan === planId}
              onSelect={() => handleSelectPlan(planId)}
            />
          </div>
        ))}
      </section>
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
