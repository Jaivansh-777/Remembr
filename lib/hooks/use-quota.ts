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
  const [mode, setMode] = useState<MemoryMode>("buddy");

  useEffect(() => {
    if (!userId) return;
    const unsub = watchUser(userId, (data) => {
      const nextMode = data?.memoryMode as MemoryMode | undefined;
      if (
        nextMode === "goldfish" ||
        nextMode === "buddy" ||
        nextMode === "soulmate"
      ) {
        setMode(nextMode);
      }
      setQuota(getQuota(data as QuotaUser | null));
    });
    return unsub;
  }, [userId]);

  return { quota, mode };
}
