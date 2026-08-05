import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api/admin";
import { getAdminDb } from "@/lib/firebase/admin";
import { toPaymentDoc, type PaymentDoc } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const pendingSnap = await db
      .collection("payments")
      .where("status", "==", "pending")
      .limit(50)
      .get();

    const recentSnap = await db
      .collection("payments")
      .where("status", "in", ["verified", "failed", "timeout"])
      .limit(20)
      .get();

    const map = new Map<string, PaymentDoc>();
    pendingSnap.docs.forEach((d) => {
      map.set(d.id, toPaymentDoc(d.id, (d.data() ?? {}) as Record<string, unknown>));
    });
    recentSnap.docs.forEach((d) => {
      if (!map.has(d.id)) {
        map.set(d.id, toPaymentDoc(d.id, (d.data() ?? {}) as Record<string, unknown>));
      }
    });

    const payments = Array.from(map.values()).sort(
      (a, b) => b.createdAt - a.createdAt
    );
    return NextResponse.json({
      payments,
      pendingCount: payments.filter((p) => p.status === "pending").length,
      reviewedBy: auth.user.uid,
    });
  } catch (error) {
    console.error("[api/payments/admin/list] failed:", error);
    return NextResponse.json(
      { error: "Failed to load payments" },
      { status: 500 }
    );
  }
}
