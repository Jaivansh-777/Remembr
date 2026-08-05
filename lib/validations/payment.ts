import { z } from "zod";

export const UPI_ID = process.env.NEXT_PUBLIC_UPI_ID ?? "remembr@fam";
export const CURRENCY = "INR";

export type PlanId = "free" | "starter" | "pro";

export interface PlanConfig {
  id: PlanId;
  label: string;
  shortLabel: string;
  emoji: string;
  tagline: string;
  /** Monthly price in INR. 0 for the free plan. Doubles as the one-time UPI payment amount. */
  priceMonthly: number;
  note: string;
  features: string[];
  memoryBadge: string;
  /** Ribbon badge shown on the card, e.g. "Most Popular". */
  highlight: string | null;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    label: "Free",
    shortLabel: "Free",
    emoji: "🐠",
    tagline: "Try the magic — no card required",
    priceMonthly: 0,
    note: "Remembr Free plan",
    features: [
      "Unlimited messages",
      "5 cross-session memories (Beta)",
      "Memory mode: Goldfish + 5 memories",
      "Files: Images only",
      "Dashboard: View only",
      "Community support",
    ],
    memoryBadge: "5 Free Memories — Try the magic",
    highlight: "Beta",
  },
  starter: {
    id: "starter",
    label: "Starter",
    shortLabel: "Starter",
    emoji: "🤝",
    tagline: "Unlimited memory for daily chat",
    priceMonthly: Number(process.env.NEXT_PUBLIC_PLAN_AMOUNT ?? 199),
    note: "Remembr Starter plan",
    features: [
      "Unlimited messages",
      "Unlimited cross-session memory",
      "Memory mode: Buddy (remembers 3 sessions)",
      "Files: Images + PDFs + DOCX",
      "Dashboard: Full access",
      "24hr email support",
    ],
    memoryBadge: "Unlimited Memories",
    highlight: "Most Popular",
  },
  pro: {
    id: "pro",
    label: "Pro",
    shortLabel: "Pro",
    emoji: "❤️",
    tagline: "Remembers everything, forever",
    priceMonthly: 599,
    note: "Remembr Pro plan",
    features: [
      "Unlimited messages",
      "Unlimited cross-session memory",
      "Memory mode: Soulmate (remembers forever)",
      "Files: All formats",
      "Dashboard: Full + Insights",
      "Priority support + WhatsApp",
    ],
    memoryBadge: "Unlimited + Soulmate",
    highlight: "Best Value",
  },
};

export function isPlanId(value: unknown): value is PlanId {
  return value === "free" || value === "starter" || value === "pro";
}

/** True only for plans that are payable via UPI. */
export function isPaidPlan(value: unknown): value is "starter" | "pro" {
  return value === "starter" || value === "pro";
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

export type PaymentStatus = "pending" | "verified" | "failed" | "timeout";
