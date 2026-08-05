"use client";

import { useEffect, useState } from "react";

import {
  computeStorageQuota,
  watchFiles,
  type StorageQuota,
} from "@/lib/files";
import { getFileTier, type FileDoc, type FileTierName } from "@/lib/file-types";
import { watchUser } from "@/lib/firebase/firestore";

export interface UseFilesResult {
  files: FileDoc[];
  tier: FileTierName;
  quota: StorageQuota;
}

export function useFiles(userId: string | null): UseFilesResult {
  const [files, setFiles] = useState<FileDoc[]>([]);
  const [tier, setTier] = useState<FileTierName>("free");

  useEffect(() => {
    if (!userId) return;
    const unsubFiles = watchFiles(userId, setFiles);
    const unsubUser = watchUser(userId, (data) => {
      setTier(getFileTier(String(data?.tier ?? "")));
    });
    return () => {
      unsubFiles();
      unsubUser();
    };
  }, [userId]);

  const quota = computeStorageQuota(tier, files);

  return { files, tier, quota };
}
