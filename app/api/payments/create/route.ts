import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { requireAuth } from "@/lib/api/auth";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  billingSchema,
  CURRENCY,
  isPaidPlan,
  PLANS,
} from "@/lib/validations/payment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isPaidPlan((body as { plan?: unknown })?.plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const parsed = billingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid billing details",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const plan = (body as { plan: "starter" | "pro" }).plan;
  const ref = db.collection("payments").doc();

  try {
    await ref.set({
      userId: auth.user.uid,
      userEmail: auth.user.email ?? "",
      plan,
      amount: PLANS[plan].priceMonthly,
      currency: CURRENCY,
      status: "pending",
      fullName: parsed.data.fullName,
      address: parsed.data.address,
      pincode: parsed.data.pincode,
      mobileNumber: parsed.data.mobileNumber,
      retryCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("[api/payments/create] failed:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { paymentId: ref.id, plan, amount: PLANS[plan].priceMonthly },
    { status: 201 }
  );
}
