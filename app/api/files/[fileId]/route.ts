import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/api/auth";
import { getAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ fileId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const { fileId } = await context.params;
  try {
    const snap = await db.collection("files").doc(fileId).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    const data = snap.data();
    if (data?.userId !== auth.user.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ file: { id: fileId, ...data } });
  } catch (error) {
    console.error("[api/files/[fileId]] get failed:", error);
    return NextResponse.json({ error: "Failed to load file" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
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
    if (data?.userId !== auth.user.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await ref.delete();
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[api/files/[fileId]] delete failed:", error);
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }
}
