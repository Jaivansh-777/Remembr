import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { requireAuth } from "@/lib/api/auth";
import { isAdminUid } from "@/lib/api/admin";
import { getAdminDb } from "@/lib/firebase/admin";
import { toPaymentDoc } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ paymentId: string }>;
}

/**
 * Marks a `pending` payment as timed out. Allowed for the payment owner
 * (their 30s window expired) or an admin.
 */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
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
    const isOwner = data.userId === auth.user.uid;
    const isAdmin = isAdminUid(auth.user.uid);
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (data.status !== "pending") {
      return NextResponse.json({
        payment: toPaymentDoc(paymentId, data),
      });
    }

    await ref.update({
      status: "timeout",
      updatedAt: FieldValue.serverTimestamp(),
    });
    const updated = await ref.get();
    return NextResponse.json({
      payment: toPaymentDoc(updated.id, (updated.data() ?? {}) as Record<string, unknown>),
    });
  } catch (error) {
    console.error("[api/payments/timeout] failed:", error);
    return NextResponse.json(
      { error: "Failed to update payment" },
      { status: 500 }
    );
  }
}
