import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/api/auth";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  checkTrialForUser,
  getMemoryLimitInfo,
  parseClientIp,
} from "@/lib/trial-protection/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Authenticated trial check run right after sign-in. Registers the device
 * fingerprint + IP for a new free user, or blocks the sign-in when this device
 * has already used the free trial / this IP has too many free accounts.
 */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({
      eligible: true,
      enforced: false,
      tier: "free",
      usedFreeTrial: false,
    });
  }

  let body: { fingerprint?: unknown } = {};
  try {
    body = (await request.json()) as { fingerprint?: unknown };
  } catch {
    /* ignore malformed body */
  }
  const fingerprint =
    typeof body.fingerprint === "string" ? body.fingerprint.trim() : "";

  const result = await checkTrialForUser(db, {
    fingerprint,
    userId: auth.user.uid,
    ip: parseClientIp(request),
    name: auth.user.name ?? null,
    email: auth.user.email ?? null,
  });

  const memory = await getMemoryLimitInfo(db, auth.user.uid);
  return NextResponse.json({ ...result, enforced: true, tier: memory.tier, memory });
}
