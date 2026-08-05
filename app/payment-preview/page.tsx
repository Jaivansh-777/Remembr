"use client";

import { AlertTriangle, Check, X } from "lucide-react";
import { toast } from "sonner";

import { PaymentQR } from "@/components/payment/PaymentQR";
import { CURRENCY, PLANS, UPI_ID, type PlanId } from "@/lib/validations/payment";
import { cn } from "@/lib/utils";

const DEMO_PAYMENT = {
  paymentId: "preview-demo",
  amount: PLANS.pro.priceMonthly,
  plan: "pro" as PlanId,
};

function DevPreview() {
  if (process.env.NODE_ENV === "production") {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <AlertTriangle className="size-8 text-[#A1A1A1]" />
        <p className="text-sm text-[#A1A1A1]">
          This preview page is only available in development.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
        <b>DEV PREVIEW</b> — shows the payment visuals with sample data. No backend
        required. Remove this page before shipping.
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-white">1. Plan cards (/upgrade)</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(Object.keys(PLANS) as PlanId[]).map((id) => {
            const config = PLANS[id];
            const selected = id === DEMO_PAYMENT.plan;
            return (
              <div
                key={id}
                className={cn(
                  "flex flex-col gap-3 rounded-2xl border p-5",
                  selected
                    ? "border-white/60 bg-white/10"
                    : "border-white/10 bg-white/5"
                )}
              >
                <div className="flex items-start justify-between">
                  <span className="text-sm font-semibold text-white">
                    {config.label}
                  </span>
                  <span
                    className={cn(
                      "size-4 rounded-full border",
                      selected ? "border-white bg-white" : "border-white/30"
                    )}
                  >
                    {selected && <Check className="size-3.5 -translate-x-px text-[#0A0A0A]" />}
                  </span>
                </div>
                <p className="text-xs text-[#A1A1A1]">{config.tagline}</p>
                <p className="text-lg font-semibold text-white">
                  {CURRENCY}{" "}
                  <span className="text-2xl">{config.priceMonthly.toLocaleString("en-IN")}</span>
                  <span className="text-xs font-normal text-[#A1A1A1]">/month</span>
                </p>
                <ul className="flex flex-col gap-1">
                  {config.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-1.5 text-xs text-[#A1A1A1]">
                      <Check className="mt-0.5 size-3 shrink-0 text-white" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-white">
          2. QR + UPI (after “Continue to payment”)
        </h2>
        <div className="mx-auto max-w-md">
          <PaymentQR
            upiId={UPI_ID}
            amount={DEMO_PAYMENT.amount}
            note={PLANS[DEMO_PAYMENT.plan].note}
            payeeName="Remembr"
            onPaid={() => toast.info("Preview only — payment flow is disabled here.")}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-white">
          3. Processing (/payment/processing)
        </h2>
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
          <span className="size-10 animate-spin rounded-full border-[3px] border-white/20 border-t-white" />
          <h3 className="text-base font-semibold text-white">Checking your payment…</h3>
          <div className="w-full">
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-[#A1A1A1]">Time remaining</span>
              <span className="font-medium text-white">18s</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[60%] rounded-full bg-white" />
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-white">
          4. Success (/payment/success)
        </h2>
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
          <span className="flex size-16 items-center justify-center rounded-full border border-white/20 bg-white/10">
            <Check className="size-8 text-white" />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Payment verified — welcome to Pro!
            </h3>
            <p className="text-sm text-[#A1A1A1]">
              Your account has been upgraded. All Pro features are now unlocked.
            </p>
          </div>
          <a
            href="/chat"
            className="flex h-11 w-full items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-[#0A0A0A]"
          >
            Continue chatting
          </a>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-white">
          5. Failed (/payment/failed)
        </h2>
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
          <span className="flex size-16 items-center justify-center rounded-full border border-white/20 bg-white/10">
            <X className="size-8 text-white" />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-white">Payment not verified</h3>
            <p className="text-sm text-[#A1A1A1]">
              The 30-second verification window closed before we could confirm your
              payment.
            </p>
          </div>
          <a
            href="/upgrade"
            className="flex h-11 w-full items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-[#0A0A0A]"
          >
            Try again
          </a>
        </div>
      </section>
    </main>
  );
}

export default function PaymentPreviewPage() {
  return <DevPreview />;
}
