import { getAdminDb } from "@/lib/firebase/admin";
import {
  FREE_DAILY_LIMIT,
  PRO_DAILY_LIMIT,
  getDayKey,
  type QuotaUser,
} from "@/lib/rate-limit";

export interface ServerQuotaResult {
  ok: boolean;
  enforced: boolean;
  used: number;
  limit: number;
  remaining: number;
}

/** Server-side enforcement via firebase-admin. Best-effort: returns ok=true
 *  (enforced=false) when no service account is configured. */
export async function checkServerQuota(
  uid: string,
  tier = "free"
): Promise<ServerQuotaResult> {
  const db = getAdminDb();
  const limit = tier === "free" ? FREE_DAILY_LIMIT : PRO_DAILY_LIMIT;
  if (!db) {
    return { ok: true, enforced: false, used: 0, limit, remaining: limit };
  }
  try {
    const ref = db.collection("users").doc(uid);
    const snap = await ref.get();
    const data = snap.exists ? (snap.data() as QuotaUser) : {};
    const today = getDayKey();
    const used = data.lastResetDate === today ? (data.messageCount ?? 0) : 0;
    const remaining =
      limit === PRO_DAILY_LIMIT ? PRO_DAILY_LIMIT : Math.max(0, limit - used);
    return { ok: remaining > 0, enforced: true, used, limit, remaining };
  } catch (error) {
    console.error("[rate-limit] server check failed:", error);
    return { ok: true, enforced: false, used: 0, limit, remaining: limit };
  }
}

export async function incrementServerQuota(uid: string): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  try {
    const ref = db.collection("users").doc(uid);
    const snap = await ref.get();
    const data = snap.exists ? (snap.data() as QuotaUser) : {};
    const today = getDayKey();
    const count =
      data.lastResetDate === today ? (data.messageCount ?? 0) : 0;
    await ref.set(
      {
        messageCount: count + 1,
        lastResetDate: today,
      },
      { merge: true }
    );
  } catch (error) {
    console.error("[rate-limit] server increment failed:", error);
  }
}
