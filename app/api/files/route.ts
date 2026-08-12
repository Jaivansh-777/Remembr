import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/api/auth";
import { deleteFilesDb, listFilesDb } from "@/lib/db/files";
import { getAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const files = await listFilesDb(auth.user.uid);

  // Merge in any legacy Firestore records (pre-Postgres uploads).
  const db = getAdminDb();
  let legacy: unknown[] = [];
  if (db) {
    try {
      const snapshot = await db
        .collection("files")
        .where("userId", "==", auth.user.uid)
        .limit(500)
        .get();
      const pgIds = new Set(files.map((file) => file.id));
      legacy = snapshot.docs
        .filter((d) => !pgIds.has(d.id))
        .map((d) => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error("[api/files] legacy list failed:", error);
    }
  }

  const merged = [...files, ...legacy];
  merged.sort(
    (a, b) =>
      Number((b as { createdAt?: number }).createdAt ?? 0) -
      Number((a as { createdAt?: number }).createdAt ?? 0)
  );
  return NextResponse.json({ files: merged });
}

export async function DELETE(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

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

  const deleted = await deleteFilesDb(ids, auth.user.uid);

  // Clean up legacy Firestore records too (best effort).
  const db = getAdminDb();
  if (db) {
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
    } catch (error) {
      console.error("[api/files] legacy bulk delete failed:", error);
    }
  }

  return NextResponse.json({ deleted });
}
