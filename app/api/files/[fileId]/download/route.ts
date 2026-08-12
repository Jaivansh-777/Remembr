import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/api/auth";
import { getFileContentDb } from "@/lib/db/files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ fileId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { fileId } = await context.params;
  const file = await getFileContentDb(fileId, auth.user.uid);
  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  return new Response(new Uint8Array(file.content), {
    headers: {
      "Content-Type": file.type ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${file.name.replace(/["\\]/g, "")}"`,
      "Content-Length": String(file.content.byteLength),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
