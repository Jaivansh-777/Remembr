import {
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import {
  FILE_TIERS,
  detectCategory,
  formatBytes,
  getFileTier,
  type FileDoc,
  type FileTierName,
  type ProcessedFilePayload,
} from "@/lib/file-types";

const filesCol = collection(db, "files");

export interface UploadTarget {
  fileId: string;
  name: string;
  url: string;
  path: string;
  type: string;
  size: number;
  category: string;
  status: string;
  summary?: string;
  text?: string;
  facts?: string[];
  keywords?: string[];
  metadata?: Record<string, unknown>;
  expiresAt?: number;
}

/**
 * Uploads a file straight to the app server, which processes it (extraction +
 * AI analysis) and stores the bytes + metadata in Postgres. Progress is
 * reported through an XHR upload listener.
 */
export function uploadFile({
  file,
  token,
  onProgress,
  signal,
}: {
  file: File;
  token: string;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}): Promise<UploadTarget> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/files/upload");
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.responseType = "json";

    if (signal) {
      signal.addEventListener(
        "abort",
        () => xhr.abort(),
        { once: true }
      );
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(event.loaded / event.total);
      }
    };

    xhr.onload = () => {
      const data = xhr.response as ProcessedFilePayload | { error?: string };
      if (xhr.status >= 200 && xhr.status < 300 && data && "name" in data) {
        resolve({
          fileId: data.fileId ?? "",
          name: data.name,
          url: data.url ?? "",
          path: "",
          type: data.type,
          size: data.size,
          category: data.category,
          status: data.status,
          summary: data.summary,
          text: data.text,
          facts: data.facts,
          keywords: data.keywords,
          metadata: data.metadata,
          expiresAt: data.expiresAt,
        });
      } else {
        const message =
          data && "error" in data && data.error
            ? data.error
            : "File processing failed";
        reject(new Error(message));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));

    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

/** Backwards-compat: builds a FileDoc from a server upload result. */
export function uploadResultToFileDoc(
  target: UploadTarget,
  userId: string,
  chatId?: string | null
): FileDoc {
  return {
    id: target.fileId,
    userId,
    chatId: chatId ?? null,
    name: target.name,
    url: target.url,
    path: target.path,
    type: target.type,
    size: target.size,
    category: target.category as FileDoc["category"],
    status: target.status as FileDoc["status"],
    summary: target.summary,
    text: target.text,
    facts: target.facts,
    keywords: target.keywords,
    metadata: target.metadata,
    createdAt: Date.now(),
    expiresAt: target.expiresAt ?? null,
  };
}

export function computeExpiry(now = Date.now()): number {
  return now + FILE_TIERS.free.expiryDays! * 24 * 60 * 60 * 1000;
}

/** Fetches a user's files from the Postgres-backed API. */
export async function fetchFiles(userId: string, token: string): Promise<FileDoc[]> {
  const response = await fetch("/api/files", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error("Failed to load files");
  }
  const data = (await response.json()) as { files?: FileDoc[] };
  return data.files ?? [];
}

/** Deletes a file via the API (removes Postgres bytes + any legacy record). */
export async function deleteFileDoc(fileId: string, token?: string) {
  if (!token) return;
  const response = await fetch(`/api/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok && response.status !== 404) {
    throw new Error("Failed to delete file");
  }
}

/** No-op for Postgres-stored files (kept for legacy Firebase paths). */
export async function deleteFileStorage(path: string) {
  void path;
}

/** Realtime subscription to a user's legacy Firestore files. */
export function watchFiles(
  userId: string,
  onUpdate: (files: FileDoc[]) => void
): () => void {
  const q = query(filesCol, where("userId", "==", userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const files = snapshot.docs.map((d) => d.data() as FileDoc);
      files.sort((a, b) => b.createdAt - a.createdAt);
      onUpdate(files);
    },
    (error) => {
      console.error("[files] watchFiles failed:", error);
    }
  );
}

export async function getFiles(userId: string): Promise<FileDoc[]> {
  const q = query(filesCol, where("userId", "==", userId));
  const snapshot = await getDocs(q);
  const files = snapshot.docs.map((d) => d.data() as FileDoc);
  files.sort((a, b) => b.createdAt - a.createdAt);
  return files;
}

export interface StorageQuota {
  tier: FileTierName;
  used: number;
  limit: number;
  remaining: number;
  percent: number;
  expiryDays: number | null;
  nearLimit: boolean;
}

export function computeStorageQuota(
  tierName: FileTierName,
  files: FileDoc[]
): StorageQuota {
  const config = FILE_TIERS[tierName];
  const used = files.reduce((sum, file) => sum + (file.size ?? 0), 0);
  const percent = config.storageLimit > 0 ? used / config.storageLimit : 0;
  return {
    tier: tierName,
    used,
    limit: config.storageLimit,
    remaining: Math.max(0, config.storageLimit - used),
    percent: Math.min(1, percent),
    expiryDays: config.expiryDays,
    nearLimit: percent >= 0.8,
  };
}

export { detectCategory, formatBytes, getFileTier };
