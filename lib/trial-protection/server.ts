import { createHash } from "node:crypto";

import { FieldValue } from "firebase-admin/firestore";

import { createId } from "@/lib/chat";
import { sendUpgradeConfirmation } from "@/lib/email";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  FREE_TRIAL_MEMORIES as FREE_TRIAL_MEMORIES_BASE,
  MAX_FREE_USERS_PER_IP as MAX_FREE_USERS_PER_IP_BASE,
  type MemoryLimitInfo,
  type TrialEligibility,
} from "@/lib/trial-protection";
import { isPaidPlan, PLANS } from "@/lib/validations/payment";

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

/** Server-side limits, overridable via env. */
export const FREE_TRIAL_MEMORIES = positiveInt(
  process.env.FREE_TRIAL_MEMORIES,
  FREE_TRIAL_MEMORIES_BASE
);
export const MAX_FREE_USERS_PER_IP = positiveInt(
  process.env.MAX_FREE_USERS_PER_IP,
  MAX_FREE_USERS_PER_IP_BASE
);

/** SHA-256 hex digest (used for IP tracking keys). */
export function hashString(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Best-effort client IP extraction from common proxy headers. */
export function parseClientIp(request: Request): string | null {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first && first !== "unknown") return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return null;
}

export async function getUserTier(
  db: NonNullable<ReturnType<typeof getAdminDb>>,
  uid: string
): Promise<string> {
  try {
    const snap = await db.collection("users").doc(uid).get();
    return snap.exists ? String(snap.data()?.tier ?? "free") : "free";
  } catch (error) {
    console.error("[trial-protection] getUserTier failed:", error);
    return "free";
  }
}

/** Counts stored personal memories, capped at limit + 1 (cheap abuse check). */
export async function countFreeMemories(
  db: NonNullable<ReturnType<typeof getAdminDb>>,
  uid: string
): Promise<number> {
  try {
    const snap = await db
      .collection("memories")
      .doc(uid)
      .collection("items")
      .limit(FREE_TRIAL_MEMORIES + 1)
      .get();
    return snap.size;
  } catch (error) {
    console.error("[trial-protection] countFreeMemories failed:", error);
    return 0;
  }
}

export async function getMemoryLimitInfo(
  db: NonNullable<ReturnType<typeof getAdminDb>>,
  uid: string
): Promise<MemoryLimitInfo> {
  const tier = await getUserTier(db, uid);
  if (tier !== "free") {
    return {
      limit: Infinity,
      count: 0,
      remaining: Infinity,
      exceeded: false,
      enforced: true,
      tier,
    };
  }
  const count = await countFreeMemories(db, uid);
  return {
    limit: FREE_TRIAL_MEMORIES,
    count,
    remaining: Math.max(0, FREE_TRIAL_MEMORIES - count),
    exceeded: count >= FREE_TRIAL_MEMORIES,
    enforced: true,
    tier,
  };
}

export interface CheckTrialInput {
  fingerprint?: string;
  userId: string;
  ip?: string | null;
  name?: string | null;
  email?: string | null;
}

export interface CheckTrialResult extends TrialEligibility {
  usedFreeTrial?: boolean;
}

/**
 * Checks whether a free-tier user is allowed on this device/IP, registering
 * the device fingerprint + IP the first time it is seen. Paid users always
 * pass (they cannot be "abused").
 */
export async function checkTrialForUser(
  db: NonNullable<ReturnType<typeof getAdminDb>>,
  input: CheckTrialInput
): Promise<CheckTrialResult> {
  const { fingerprint, userId, ip } = input;
  if (!fingerprint) return { eligible: true, usedFreeTrial: false };

  const tier = await getUserTier(db, userId);
  if (tier !== "free") {
    return { eligible: true, usedFreeTrial: true };
  }

  const fpRef = db.collection("deviceFingerprints").doc(fingerprint);
  let result: CheckTrialResult = { eligible: true };

  try {
    await db.runTransaction(async (tx) => {
      const fpSnap = await tx.get(fpRef);
      if (fpSnap.exists) {
        const fpUserId = String(fpSnap.data()?.userId ?? "");
        if (fpUserId === userId) {
          tx.update(fpRef, {
            lastSeenAt: FieldValue.serverTimestamp(),
            ...(ip ? { ips: FieldValue.arrayUnion(ip) } : {}),
          });
          result = { eligible: true };
        } else {
          result = { eligible: false, reason: "device_used" };
        }
        return;
      }

      if (ip) {
        const ipRef = db.collection("ipTracker").doc(hashString(ip));
        const ipSnap = await tx.get(ipRef);
        const userIds =
          (ipSnap.exists
            ? (ipSnap.data()?.userIds as string[] | undefined)
            : undefined) ?? [];
        if (userIds.length >= MAX_FREE_USERS_PER_IP) {
          result = { eligible: false, reason: "ip_limit" };
          return;
        }
        tx.set(
          ipRef,
          {
            ip,
            userIds: FieldValue.arrayUnion(userId),
            firstSeenAt: FieldValue.serverTimestamp(),
            lastSeenAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      tx.set(fpRef, {
        userId,
        name: input.name ?? null,
        email: input.email ?? null,
        freeTrialUsed: true,
        firstSeenAt: FieldValue.serverTimestamp(),
        lastSeenAt: FieldValue.serverTimestamp(),
        ...(ip ? { ips: FieldValue.arrayUnion(ip) } : {}),
      });
      tx.set(
        db.collection("users").doc(userId),
        { usedFreeTrial: true },
        { merge: true }
      );
      result = { eligible: true, registered: true };
    });
  } catch (error) {
    console.error("[trial-protection] fingerprint transaction failed:", error);
    return { eligible: true, usedFreeTrial: false };
  }

  return { ...result, usedFreeTrial: true };
}

/**
 * Pre-auth check used by the signup page: has this device already been used
 * for a free trial? Never registers anything.
 */
export async function checkFingerprintBlocked(
  db: NonNullable<ReturnType<typeof getAdminDb>>,
  fingerprint: string
): Promise<TrialEligibility> {
  if (!fingerprint) return { eligible: true };
  const snap = await db.collection("deviceFingerprints").doc(fingerprint).get();
  if (!snap.exists) return { eligible: true };
  return { eligible: false, reason: "device_used" };
}

export interface ApplyUpgradeInput {
  userId: string;
  plan: "starter" | "pro";
  amount: number;
  paymentId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  billing?: Record<string, unknown> | null;
}

export interface ApplyUpgradeResult {
  ok: boolean;
  error?: string;
  tier?: string;
  fromTier?: string;
  upgradeId?: string;
}

/**
 * Applies a paid plan to a user: flips the tier, records the upgrade and
 * (best-effort) emails a confirmation. Safe to re-run (idempotent).
 */
export async function applyUpgrade(
  db: NonNullable<ReturnType<typeof getAdminDb>>,
  input: ApplyUpgradeInput
): Promise<ApplyUpgradeResult> {
  if (!isPaidPlan(input.plan)) {
    return { ok: false, error: "Invalid plan" };
  }
  if (!input.userId) {
    return { ok: false, error: "User is required" };
  }

  const userRef = db.collection("users").doc(input.userId);
  const userSnap = await userRef.get();
  const userData = userSnap.exists ? userSnap.data() : {};
  const fromTier = String(userData?.tier ?? "free");

  const upgradeId = createId();
  const now = FieldValue.serverTimestamp();

  await userRef.set(
    {
      tier: input.plan,
      upgradedAt: now,
      paymentVerifiedAt: now,
      usedFreeTrial: true,
      billing: input.billing ?? null,
    },
    { merge: true }
  );

  await db.collection("upgrades").doc(upgradeId).set({
    userId: input.userId,
    fromTier,
    toTier: input.plan,
    amount: input.amount,
    paymentId: input.paymentId ?? null,
    isActive: true,
    createdAt: now,
    upgradedAt: now,
  });

  await sendUpgradeConfirmation({
    to: input.userEmail ?? String(userData?.email ?? ""),
    name: input.userName ?? String(userData?.name ?? ""),
    plan: PLANS[input.plan].label,
    amount: input.amount,
    paymentId: input.paymentId ?? undefined,
  });

  return { ok: true, tier: input.plan, fromTier, upgradeId };
}

/**
 * Applies an upgrade from an already-verified payment doc (shared by the
 * payment verify + upgrade verify routes).
 */
export async function applyUpgradeFromPayment(
  db: NonNullable<ReturnType<typeof getAdminDb>>,
  paymentId: string
): Promise<ApplyUpgradeResult> {
  const snap = await db.collection("payments").doc(paymentId).get();
  if (!snap.exists) return { ok: false, error: "Payment not found" };
  const data = snap.data() as Record<string, unknown>;
  if (String(data.status ?? "") !== "verified") {
    return { ok: false, error: "Payment is not verified" };
  }
  const plan = data.plan;
  if (!isPaidPlan(plan)) {
    return { ok: false, error: "Invalid payment plan" };
  }
  const amount = Number(data.amount ?? PLANS[plan].priceMonthly);
  return applyUpgrade(db, {
    userId: String(data.userId ?? ""),
    plan,
    amount,
    paymentId,
    userEmail: data.userEmail ? String(data.userEmail) : null,
    userName: data.fullName ? String(data.fullName) : null,
    billing: {
      fullName: data.fullName ?? null,
      address: data.address ?? null,
      pincode: data.pincode ?? null,
      mobileNumber: data.mobileNumber ?? null,
      plan,
      amount,
    },
  });
}
