import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { requireAdmin } from "@/lib/api/admin";
import { getAdminDb } from "@/lib/firebase/admin";
import { applyUpgradeFromPayment } from "@/lib/trial-protection/server";
import { toPaymentDoc } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ paymentId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  let body: { action?: unknown };
  try {
    body = (await request.json()) as { action?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = body.action;
  if (action !== "verify" && action !== "reject") {
    return NextResponse.json(
      { error: "Action must be 'verify' or 'reject'" },
      { status: 400 }
    );
  }

  const { paymentId } = await context.params;
  try {
    const ref = db.collection("payments").doc(paymentId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }
    const data = snap.data() as Record<string, unknown>;
    if (data.status !== "pending") {
      return NextResponse.json(
        { error: `Payment already ${String(data.status)}` },
        { status: 409 }
      );
    }

    const updates: Record<string, unknown> = {
      status: action === "verify" ? "verified" : "failed",
      verifiedAt: action === "verify" ? FieldValue.serverTimestamp() : data.verifiedAt,
      updatedAt: FieldValue.serverTimestamp(),
      reviewedBy: auth.user.uid,
    };
    await ref.update(updates);

    let upgrade: Awaited<ReturnType<typeof applyUpgradeFromPayment>> | null =
      null;
    if (action === "verify") {
      upgrade = await applyUpgradeFromPayment(db, paymentId);
      if (!upgrade.ok) {
        console.error("[api/payments/verify] upgrade failed:", upgrade.error);
      }
    }

    const updated = await ref.get();
    return NextResponse.json({
      payment: toPaymentDoc(updated.id, (updated.data() ?? {}) as Record<string, unknown>),
      upgrade,
    });
  } catch (error) {
    console.error("[api/payments/verify] failed:", error);
    return NextResponse.json(
      { error: "Failed to update payment" },
      { status: 500 }
    );
  }
}
