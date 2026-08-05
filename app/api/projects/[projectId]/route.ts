import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireAuth } from "@/lib/api/auth";
import { getAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ projectId: string }>;
}

async function isMemberOrOwner(
  db: NonNullable<ReturnType<typeof getAdminDb>>,
  projectId: string,
  uid: string
): Promise<boolean> {
  const snap = await db.collection("projects").doc(projectId).get();
  if (!snap.exists) return false;
  const data = snap.data() ?? {};
  return data.members?.includes(uid) || data.ownerId === uid;
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
    if (!(await isMemberOrOwner(db, projectId, auth.user.uid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const snap = await db.collection("projects").doc(projectId).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({ project: { id: snap.id, ...snap.data() } });
  } catch (error) {
    console.error("[api/projects] get failed:", error);
    return NextResponse.json({ error: "Failed to load project" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const { projectId } = await params;
  let body: { name?: string; description?: string };
  try {
    body = (await request.json()) as { name?: string; description?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const ref = db.collection("projects").doc(projectId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (snap.data()?.ownerId !== auth.user.uid) {
      return NextResponse.json({ error: "Only the owner can update a project" }, { status: 403 });
    }
    const updates: { name?: string; description?: string; updatedAt: Date } = {
      updatedAt: new Date(),
    };
    if (typeof body.name === "string" && body.name.trim()) {
      updates.name = body.name.trim();
    }
    if (typeof body.description === "string") {
      updates.description = body.description.trim();
    }
    await ref.update(updates);
    const updated = await ref.get();
    return NextResponse.json({ project: { id: updated.id, ...updated.data() } });
  } catch (error) {
    console.error("[api/projects] update failed:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const { projectId } = await params;
  try {
    const ref = db.collection("projects").doc(projectId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (snap.data()?.ownerId !== auth.user.uid) {
      return NextResponse.json({ error: "Only the owner can delete a project" }, { status: 403 });
    }
    await ref.delete();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/projects] delete failed:", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
