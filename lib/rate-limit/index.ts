export const FREE_DAILY_LIMIT = Infinity;
export const PRO_DAILY_LIMIT = Infinity;

export interface Quota {
  used: number;
  limit: number;
  remaining: number;
  resetsAt: string;
}

export interface QuotaUser {
  tier?: string | null;
  messageCount?: number | null;
  lastResetDate?: string | null;
}

/** Day key in UTC (e.g. "2026-08-05"). Counts reset at 12:00 AM UTC. */
export function getDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function getQuota(user: QuotaUser | null | undefined): Quota {
  const tier = user?.tier ?? "free";
  const limit = tier === "free" ? FREE_DAILY_LIMIT : PRO_DAILY_LIMIT;
  const today = getDayKey();
  const used =
    user?.lastResetDate === today ? (user?.messageCount ?? 0) : 0;
  const remaining = limit === PRO_DAILY_LIMIT ? PRO_DAILY_LIMIT : Math.max(0, limit - used);
  return { used, limit, remaining, resetsAt: today };
}

export function isQuotaExhausted(quota: Quota): boolean {
  return quota.remaining <= 0;
}
