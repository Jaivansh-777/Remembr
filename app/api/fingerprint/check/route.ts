import { NextResponse } from "next/server";

import { getAdminDb } from "@/lib/firebase/admin";
import { checkFingerprintBlocked } from "@/lib/trial-protection/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Pre-auth check used by the signup page: has this device already claimed the
 * free trial? Never registers anything — see /api/auth/check-trial for the
 * authenticated check + registration.
 */
export async function POST(request: Request) {
  let body: { fingerprint?: unknown };
  try {
    body = (await request.json()) as { fingerprint?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const fingerprint =
    typeof body.fingerprint === "string" ? body.fingerprint.trim() : "";

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ eligible: true, enforced: false });
  }
  if (!fingerprint) {
    return NextResponse.json({ error: "Fingerprint is required" }, { status: 400 });
  }

  const result = await checkFingerprintBlocked(db, fingerprint);
  return NextResponse.json({ ...result, enforced: true });
}
