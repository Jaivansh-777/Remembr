import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/api/auth";
import { processFileBuffer } from "@/lib/file-processing";
import {
  FILE_TIERS,
  formatBytes,
  getFileTier,
  isSupportedFileName,
  type FileTierName,
  type ProcessedFilePayload,
} from "@/lib/file-types";
import { getAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const name = file.name || "upload";
  if (!isSupportedFileName(name)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength === 0) {
    return NextResponse.json({ error: "File is empty" }, { status: 400 });
  }

  let tier: FileTierName = "free";
  const db = getAdminDb();
  if (db) {
    try {
      const userSnap = await db.collection("users").doc(auth.user.uid).get();
      tier = getFileTier(String(userSnap.data()?.tier ?? ""));
    } catch {
      /* keep free tier fallback */
    }
  }

  const tierConfig = FILE_TIERS[tier];
  if (buffer.byteLength > tierConfig.fileSizeLimit) {
    return NextResponse.json(
      {
        error: `File exceeds the ${tier} plan limit of ${formatBytes(
          tierConfig.fileSizeLimit
        )}`,
      },
      { status: 413 }
    );
  }

  let processed;
  try {
    processed = await processFileBuffer(buffer, name, file.type);
  } catch (error) {
    console.error("[api/files/upload] processing failed:", error);
    return NextResponse.json({ error: "Could not process file" }, { status: 500 });
  }

  const expiresAt = tierConfig.expiryDays
    ? Date.now() + tierConfig.expiryDays * 24 * 60 * 60 * 1000
    : null;

  const payload: ProcessedFilePayload = {
    name: processed.name,
    type: processed.type,
    category: processed.category,
    size: processed.size,
    status: "ready",
    summary: processed.summary,
    text: processed.text.slice(0, 30000),
    facts: processed.facts,
    keywords: processed.keywords,
    metadata: processed.metadata,
    expiresAt: expiresAt ?? undefined,
  };

  return NextResponse.json(payload);
}
