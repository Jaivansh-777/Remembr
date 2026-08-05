import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/api/auth";
import { getAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  try {
    const snapshot = await db
      .collection("files")
      .where("userId", "==", auth.user.uid)
      .limit(500)
      .get();
    const files = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ files });
  } catch (error) {
    console.error("[api/files] list failed:", error);
    return NextResponse.json({ error: "Failed to load files" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  let ids: string[];
  try {
    const body = (await request.json()) as { ids?: unknown };
    ids = Array.isArray(body.ids)
      ? body.ids.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (ids.length === 0) {
    return NextResponse.json({ error: "No file ids provided" }, { status: 400 });
  }

  try {
    const batch = db.batch();
    for (const id of ids) {
      const ref = db.collection("files").doc(id);
      const snap = await ref.get();
      if (snap.exists && snap.data()?.userId === auth.user.uid) {
        batch.delete(ref);
      }
    }
    await batch.commit();
    return NextResponse.json({ deleted: ids.length });
  } catch (error) {
    console.error("[api/files] bulk delete failed:", error);
    return NextResponse.json({ error: "Failed to delete files" }, { status: 500 });
  }
}
