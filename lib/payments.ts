import { PLANS, type PaymentStatus, type PlanId } from "@/lib/validations/payment";

export interface PaymentDoc {
  id: string;
  userId: string;
  userEmail: string;
  plan: PlanId;
  planLabel: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  fullName: string;
  address: string;
  pincode: string;
  mobileNumber: string;
  retryCount: number;
  createdAt: number;
  updatedAt: number;
  verifiedAt?: number;
  note?: string;
}

/** Converts a Firestore `payments` doc (admin SDK or client SDK timestamp) to a JSON-safe shape. */
export function toPaymentDoc(
  id: string,
  data: Record<string, unknown>
): PaymentDoc {
  const plan = isPlanIdSafe(data.plan) ? data.plan : "pro";
  const rawStatus = String(data.status ?? "pending") as PaymentStatus;
  const status: PaymentStatus = ["pending", "verified", "failed", "timeout"].includes(
    rawStatus
  )
    ? rawStatus
    : "pending";
  return {
    id,
    userId: String(data.userId ?? ""),
    userEmail: String(data.userEmail ?? ""),
    plan,
    planLabel: PLANS[plan].shortLabel,    amount: Number(data.amount ?? 0),
    currency: String(data.currency ?? "INR"),
    status,
    fullName: String(data.fullName ?? ""),
    address: String(data.address ?? ""),
    pincode: String(data.pincode ?? ""),
    mobileNumber: String(data.mobileNumber ?? ""),
    retryCount: Number(data.retryCount ?? 0),
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
    verifiedAt: data.verifiedAt ? toMillis(data.verifiedAt) : undefined,
    note: data.note ? String(data.note) : undefined,
  };
}

function isPlanIdSafe(value: unknown): value is "starter" | "pro" {
  return value === "starter" || value === "pro";
}

/** Normalizes a Firestore Timestamp / Date / number / seconds-object into millis. */
export function toMillis(value: unknown): number {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.toMillis === "function") {
      return (record.toMillis as () => number)();
    }
    if (typeof record._seconds === "number") {
      return record._seconds * 1000 + (typeof record._nanoseconds === "number"
        ? Math.floor(record._nanoseconds / 1e6)
        : 0);
    }
    if (typeof record.seconds === "number") {
      return record.seconds * 1000 + (typeof record.nanoseconds === "number"
        ? Math.floor(record.nanoseconds / 1e6)
        : 0);
    }
    if (record instanceof Date) return record.getTime();
  }
  if (typeof value === "number") return value;
  return 0;
}
