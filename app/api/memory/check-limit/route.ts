import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/api/auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { getMemoryLimitInfo } from "@/lib/trial-protection/server";
import { FREE_TRIAL_MEMORIES } from "@/lib/trial-protection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns the authenticated user's current memory limit + usage. Used by the
 * client to know when to show the upgrade prompt.
 */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({
      limit: FREE_TRIAL_MEMORIES,
      count: 0,
      remaining: FREE_TRIAL_MEMORIES,
      exceeded: false,
      enforced: false,
      tier: "free",
    });
  }

  const memory = await getMemoryLimitInfo(db, auth.user.uid);
  return NextResponse.json(memory);
}
