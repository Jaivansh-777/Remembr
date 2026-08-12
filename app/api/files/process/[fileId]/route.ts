import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/api/auth";
import { getFileDb, updateFileDb } from "@/lib/db/files";
import { processFileBuffer } from "@/lib/file-processing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface RouteContext {
  params: Promise<{ fileId: string }>;
}

/** Re-runs extraction + analysis on the stored original bytes. */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { fileId } = await context.params;

  const { getFileContentDb } = await import("@/lib/db/files");
  const file = await getFileDb(fileId, auth.user.uid);
  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const stored = await getFileContentDb(fileId, auth.user.uid);
  if (!stored) {
    return NextResponse.json(
      { error: "Original file content is not available" },
      { status: 404 }
    );
  }

  try {
    const processed = await processFileBuffer(
      stored.content,
      stored.name,
      stored.type ?? ""
    );

    const updated = await updateFileDb(fileId, auth.user.uid, {
      status: "ready",
      summary: processed.summary,
      text: processed.text.slice(0, 30000),
      facts: processed.facts,
      keywords: processed.keywords,
      metadata: processed.metadata,
      error: null,
    });
    if (!updated) {
      return NextResponse.json({ error: "Failed to update file" }, { status: 500 });
    }

    const refreshed = await getFileDb(fileId, auth.user.uid);
    return NextResponse.json({ file: refreshed });
  } catch (error) {
    console.error("[api/files/process] reprocess failed:", error);
    return NextResponse.json({ error: "Failed to reprocess file" }, { status: 500 });
  }
}
