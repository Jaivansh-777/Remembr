import { z } from "zod";

export const UPI_ID = process.env.NEXT_PUBLIC_UPI_ID ?? "remembr@fam";
export const CURRENCY = "INR";

export type PlanId = "pro" | "team";

export interface PlanConfig {
  id: PlanId;
  label: string;
  shortLabel: string;
  description: string;
  amount: number;
  note: string;
  features: string[];
}

export const PLANS: Record<PlanId, PlanConfig> = {
  pro: {
    id: "pro",
    label: "Remembr Pro",
    shortLabel: "Pro",
    description: "Unlimited AI memory with no daily caps",
    amount: Number(process.env.NEXT_PUBLIC_PLAN_AMOUNT ?? 199),
    note: "Remembr Pro plan",
    features: [
      "Unlimited daily messages",
      "Priority AI responses",
      "File uploads & storage",
      "Everything you love, without limits",
    ],
  },
  team: {
    id: "team",
    label: "Remembr Team",
    shortLabel: "Team",
    description: "Everything in Pro plus shared team projects",
    amount: 499,
    note: "Remembr Team plan",
    features: [
      "Everything in Pro",
      "Unlimited team projects",
      "Shared team memory",
      "Invite & manage members",
    ],
  },
};

export function isPlanId(value: unknown): value is PlanId {
  return value === "pro" || value === "team";
}

export const billingSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name"),
  address: z
    .string()
    .trim()
    .min(10, "Enter a complete delivery address"),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
  mobileNumber: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "Enter a valid 10-digit mobile number"),
});

export type BillingFormValues = z.infer<typeof billingSchema>;

/** Builds the UPI deep link encoded inside the QR code. */
export function upiDeepLink(opts: {
  upiId: string;
  amount: number;
  note: string;
  name?: string;
}): string {
  const params = new URLSearchParams({
    pa: opts.upiId,
    pn: opts.name ?? "Remembr",
    am: opts.amount.toFixed(2),
    cu: CURRENCY,
    tn: opts.note,
  });
  return `upi://pay?${params.toString()}`;
}

export type PaymentStatus = "pending" | "verified" | "failed" | "timeout";

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Pending",
  verified: "Verified",
  failed: "Failed",
  timeout: "Timeout",
};
