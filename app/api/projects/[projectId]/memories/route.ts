import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireAuth } from "@/lib/api/auth";
import { getAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ projectId: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const { projectId } = await params;
  try {
    const projectSnap = await db.collection("projects").doc(projectId).get();
    if (!projectSnap.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const data = projectSnap.data() ?? {};
    const members: string[] = Array.isArray(data.members) ? data.members : [];
    if (data.ownerId !== auth.user.uid && !members.includes(auth.user.uid)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const snapshot = await db
      .collection("projects")
      .doc(projectId)
      .collection("memories")
      .orderBy("timestamp", "desc")
      .limit(200)
      .get();
    const memories = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ memories });
  } catch (error) {
    console.error("[api/projects] memories failed:", error);
    return NextResponse.json({ error: "Failed to load memories" }, { status: 500 });
  }
}
