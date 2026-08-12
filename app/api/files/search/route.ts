import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/api/auth";
import { searchFilesDb } from "@/lib/db/files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim().toLowerCase() ?? "";

  if (query) {
    const files = await searchFilesDb(auth.user.uid, query);
    return NextResponse.json({ files });
  }

  return NextResponse.json({ files: [] });
}
