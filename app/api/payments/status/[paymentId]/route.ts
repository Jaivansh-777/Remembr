import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/api/auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { toPaymentDoc } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ paymentId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
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
    const snap = await db.collection("payments").doc(paymentId).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }
    const data = snap.data() as Record<string, unknown>;
    if (data.userId !== auth.user.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ payment: toPaymentDoc(paymentId, data) });
  } catch (error) {
    console.error("[api/payments/status] failed:", error);
    return NextResponse.json(
      { error: "Failed to load payment" },
      { status: 500 }
    );
  }
}
