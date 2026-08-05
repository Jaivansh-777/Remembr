import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from "firebase/storage";

import { createId } from "@/lib/chat";
import { db, storage } from "@/lib/firebase";
import {
  FILE_TIERS,
  detectCategory,
  formatBytes,
  getFileTier,
  sanitizeFileName,
  type FileDoc,
  type FileTierName,
  type ProcessedFilePayload,
} from "@/lib/file-types";

const filesCol = collection(db, "files");

export interface UploadTarget {
  name: string;
  url: string;
  path: string;
  type: string;
  size: number;
}

/** Uploads a file to Firebase Storage under users/{userId}/files/{scope}/{name}_{ts}. */
export function uploadFile({
  userId,
  file,
  projectId,
  onProgress,
  signal,
}: {
  userId: string;
  file: File;
  projectId?: string | null;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}): Promise<UploadTarget> {
  const scope = projectId ?? "personal";
  const path = `users/${userId}/files/${scope}/${sanitizeFileName(file.name)}_${Date.now()}`;
  const fileRef = ref(storage, path);
  const task = uploadBytesResumable(fileRef, file);

  if (signal) {
    signal.addEventListener("abort", () => task.cancel(), { once: true });
  }

  return new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      (snapshot) => {
        const fraction = snapshot.totalBytes
          ? snapshot.bytesTransferred / snapshot.totalBytes
          : 0;
        onProgress?.(fraction);
      },
      (error) => reject(error),
      async () => {
        const url = await getDownloadURL(fileRef);
        resolve({
          name: file.name,
          url,
          path,
          type: file.type || "application/octet-stream",
          size: file.size,
        });
      }
    );
  });
}

export async function processFileOnServer(file: File, token: string): Promise<ProcessedFilePayload> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch("/api/files/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = (await response.json()) as
    | ProcessedFilePayload
    | { error?: string };
  if (!response.ok) {
    const message =
      "error" in data && data.error ? data.error : "File processing failed";
    throw new Error(message);
  }
  return data as ProcessedFilePayload;
}

export function computeExpiry(now = Date.now()): number {
  return now + FILE_TIERS.free.expiryDays! * 24 * 60 * 60 * 1000;
}

/** Persists a file record to Firestore `files/{id}`. */
export async function createFileDoc(
  userId: string,
  input: Omit<FileDoc, "id" | "userId" | "createdAt">
): Promise<string> {
  const id = createId();
  await setDoc(doc(filesCol, id), {
    id,
    userId,
    ...input,
    createdAt: Date.now(),
  });
  return id;
}

export async function updateFileDoc(
  fileId: string,
  patch: Partial<FileDoc>
) {
  await updateDoc(doc(filesCol, fileId), patch);
}

export async function deleteFileDoc(fileId: string) {
  await deleteDoc(doc(filesCol, fileId));
}

export async function deleteFileStorage(path: string) {
  try {
    await deleteObject(ref(storage, path));
  } catch (error) {
    console.warn("[files] storage delete failed:", error);
  }
}

/** Realtime subscription to a user's files (client-side sorted, no composite index). */
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
