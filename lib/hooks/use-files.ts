"use client";

import { useCallback, useEffect, useState } from "react";

import {
  computeStorageQuota,
  fetchFiles,
  type StorageQuota,
} from "@/lib/files";
import { getFileTier, type FileDoc, type FileTierName } from "@/lib/file-types";
import { useAuth } from "@/lib/auth-context";
import { watchUser } from "@/lib/firebase/firestore";

export interface UseFilesResult {
  files: FileDoc[];
  tier: FileTierName;
  quota: StorageQuota;
  refresh: () => Promise<void>;
}

const REFRESH_MS = 5000;

export function useFiles(userId: string | null): UseFilesResult {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileDoc[]>([]);
  const [tier, setTier] = useState<FileTierName>("free");

  const load = useCallback(
    async (token: string) => {
      if (!userId) return;
      try {
        const list = await fetchFiles(userId, token);
        setFiles(list);
      } catch (error) {
        console.error("[use-files] fetch failed:", error);
      }
    },
    [userId]
  );

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const token = await user?.getIdToken();
        if (!token || cancelled) return;
        await load(token);
      } finally {
        if (!cancelled) timer = setTimeout(poll, REFRESH_MS);
      }
    };
    void poll();

    const unsubUser = watchUser(userId, (data) => {
      setTier(getFileTier(String(data?.tier ?? "")));
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      unsubUser();
    };
  }, [userId, user, load]);

  const quota = computeStorageQuota(tier, files);

  const refresh = useCallback(async () => {
    if (!user) return;
    await load(await user.getIdToken());
  }, [user, load]);

  return { files, tier, quota, refresh };
}
