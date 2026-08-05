import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/api/auth";
import { processFileBuffer } from "@/lib/file-processing";
import { getAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface RouteContext {
  params: Promise<{ fileId: string }>;
}

/** Re-downloads the original object from Storage and re-runs extraction + analysis. */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const { fileId } = await context.params;
  try {
    const ref = db.collection("files").doc(fileId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    const data = snap.data();
    if (!data || data.userId !== auth.user.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const response = await fetch(String(data.url), {
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) {
      return NextResponse.json({ error: "Could not download original file" }, { status: 502 });
    }
    const buffer = Buffer.from(await response.arrayBuffer());

    const processed = await processFileBuffer(
      buffer,
      String(data.name),
      String(data.type ?? "")
    );

    await ref.update({
      status: "ready",
      summary: processed.summary,
      text: processed.text.slice(0, 30000),
      facts: processed.facts,
      keywords: processed.keywords,
      metadata: processed.metadata,
      error: undefined,
    });

    return NextResponse.json({ file: { id: fileId, ...(await ref.get()).data() } });
  } catch (error) {
    console.error("[api/files/process] reprocess failed:", error);
    return NextResponse.json({ error: "Failed to reprocess file" }, { status: 500 });
  }
}
