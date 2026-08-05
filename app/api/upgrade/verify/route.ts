import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api/admin";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  applyUpgrade,
  applyUpgradeFromPayment,
} from "@/lib/trial-protection/server";
import { isPaidPlan } from "@/lib/validations/payment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin-only upgrade application. Either points at an already-verified payment
 * (`{ paymentId }`) to apply its plan, or applies a plan directly
 * (`{ userId, plan, amount }`) for manual/coupon upgrades.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  let body: {
    userId?: unknown;
    plan?: unknown;
    paymentId?: unknown;
    amount?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.paymentId === "string" && body.paymentId.trim()) {
    const result = await applyUpgradeFromPayment(db, body.paymentId.trim());
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  if (typeof body.userId !== "string" || !body.userId.trim()) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  if (!isPaidPlan(body.plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const result = await applyUpgrade(db, {
    userId: body.userId.trim(),
    plan: body.plan,
    amount,
    paymentId: null,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
