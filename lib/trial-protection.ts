/**
 * Free-trial protection constants + types shared by client and server code.
 *
 * These are the hard-coded defaults. Server-only overrides read
 * `MAX_FREE_USERS_PER_IP` / `FREE_TRIAL_MEMORIES` from env in
 * `lib/trial-protection/server.ts`.
 */

/** Max distinct free accounts that can be created from a single IP before new signups are blocked. */
export const MAX_FREE_USERS_PER_IP = 3;

/** Cross-session memories a free-tier account can store before it must upgrade. */
export const FREE_TRIAL_MEMORIES = 5;

export type TrialBlockReason = "device_used" | "ip_limit";

export interface TrialEligibility {
  eligible: boolean;
  reason?: TrialBlockReason;
  /** True when the device fingerprint record was created/updated for this user. */
  registered?: boolean;
}

export interface MemoryLimitInfo {
  /** Memory cap for the current tier (Infinity for paid tiers). */
  limit: number;
  /** Number of cross-session memories currently stored. */
  count: number;
  /** Slots remaining before the cap is hit. */
  remaining: number;
  /** True when the cap has been reached (free tier only). */
  exceeded: boolean;
  /** False when the server has no admin SDK (limit not enforced). */
  enforced: boolean;
  tier: string;
}
