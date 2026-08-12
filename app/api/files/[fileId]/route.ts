import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/api/auth";
import { deleteFileDb, getFileDb } from "@/lib/db/files";
import { getAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ fileId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { fileId } = await context.params;

  const dbFile = await getFileDb(fileId, auth.user.uid);
  if (dbFile) {
    return NextResponse.json({ file: dbFile });
  }

  // Legacy files (pre-Postgres) live in Firestore.
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
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

  const { fileId } = await context.params;

  const deleted = await deleteFileDb(fileId, auth.user.uid);

  // Also remove any legacy Firestore record for the same id (best effort).
  const db = getAdminDb();
  if (db) {
    try {
      const ref = db.collection("files").doc(fileId);
      const snap = await ref.get();
      if (snap.exists && snap.data()?.userId === auth.user.uid) {
        await ref.delete();
      }
    } catch (error) {
      console.error("[api/files/[fileId]] firestore delete failed:", error);
    }
  }

  if (!deleted) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
