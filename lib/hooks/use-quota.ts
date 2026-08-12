"use client";

import { useEffect, useState } from "react";

import type { MemoryMode } from "@/lib/chat";
import { watchUser } from "@/lib/firebase/firestore";
import { getQuota, type Quota, type QuotaUser } from "@/lib/rate-limit";

interface UseQuotaResult {
  quota: Quota;
  mode: MemoryMode;
}

export function useQuota(userId: string | null): UseQuotaResult {
  const [quota, setQuota] = useState<Quota>(() => getQuota(null));

  useEffect(() => {
    if (!userId) return;
    const unsub = watchUser(userId, (data) => {
      setQuota(getQuota(data as QuotaUser | null));
    });
    return unsub;
  }, [userId]);

  return { quota, mode: "soulmate" };
}
