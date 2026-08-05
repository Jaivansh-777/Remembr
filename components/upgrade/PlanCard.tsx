"use client";

import { Check } from "lucide-react";

import { CURRENCY, PLANS, type PlanId } from "@/lib/validations/payment";
import { cn } from "@/lib/utils";

interface PlanCardProps {
  planId: PlanId;
  /** True when this is the user's current plan (button becomes disabled). */
  isCurrent: boolean;
  /** True when the plan is selected in the payment flow. */
  selected: boolean;
  onSelect?: () => void;
}

const BUTTON_STYLES: Record<PlanId, string> = {
  free: "border border-white/10 bg-white/5 text-[#A1A1A1] cursor-not-allowed",
  starter: "bg-[#7C3AED] text-white hover:bg-[#6D28D9]",
  pro: "bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white hover:opacity-90",
};

export function PlanCard({ planId, isCurrent, selected, onSelect }: PlanCardProps) {
  const plan = PLANS[planId];
  const disabled = isCurrent || planId === "free";

  return (
    <div
      className={cn(
        "relative flex flex-col gap-5 rounded-2xl border bg-white/5 p-6 backdrop-blur-xl transition-colors",
        selected
          ? "border-[#7C3AED]/70"
          : "border-white/10 hover:border-white/25"
      )}
    >
      {plan.highlight && (
        <span
          className={cn(
            "absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider",
            planId === "free"
              ? "border border-white/15 bg-white/10 text-[#A1A1A1]"
              : planId === "starter"
                ? "bg-[#7C3AED] text-white shadow-[0_0_20px_rgba(124,58,237,0.45)]"
                : "bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white shadow-[0_0_20px_rgba(124,58,237,0.5)]"
          )}
        >
          {plan.highlight}
        </span>
      )}

      <div className="flex flex-col gap-1">
        <p className="text-2xl">{plan.emoji}</p>
        <h3 className="text-lg font-semibold tracking-tight text-white">
          {plan.label}
        </h3>
        <p className="text-xs text-[#A1A1A1]">{plan.tagline}</p>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-semibold text-white">
          {CURRENCY} {plan.priceMonthly.toLocaleString("en-IN")}
        </span>
        <span className="text-sm text-[#A1A1A1]">/month</span>
      </div>

      <ul className="flex flex-col gap-2">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-[#A1A1A1]">
            <Check className="mt-0.5 size-3.5 shrink-0 text-[#A78BFA]" />
            {feature}
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-col gap-4">
        <p className="rounded-xl border border-[#7C3AED]/25 bg-[#7C3AED]/10 px-3 py-2 text-center text-xs font-medium text-[#C4B5FD]">
          {plan.memoryBadge}
        </p>
        <button
          type="button"
          disabled={disabled}
          onClick={onSelect}
          className={cn(
            "flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold transition-all disabled:cursor-not-allowed",
            disabled ? BUTTON_STYLES.free : BUTTON_STYLES[planId]
          )}
        >
          {disabled ? "Current Plan" : `Upgrade to ${plan.label}`}
        </button>
      </div>
    </div>
  );
}
