import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { requireAuth } from "@/lib/api/auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { generateInviteCode } from "@/lib/projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const snapshot = await db
      .collection("projects")
      .where("members", "array-contains", auth.user.uid)
      .limit(100)
      .get();
    const projects = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    return NextResponse.json({ projects });
  } catch (error) {
    console.error("[api/projects] list failed:", error);
    return NextResponse.json({ error: "Failed to load projects" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  let body: { name?: string; description?: string };
  try {
    body = (await request.json()) as { name?: string; description?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Project name is required" }, { status: 400 });
  }

  try {
    const inviteCode = generateInviteCode();
    const now = new Date();
    const projectRef = await db.collection("projects").add({
      name,
      description: body.description?.trim() ?? "",
      ownerId: auth.user.uid,
      members: [auth.user.uid],
      inviteCodes: [inviteCode],
      chatIds: [],
      memoryCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    await db
      .collection("users")
      .doc(auth.user.uid)
      .set({ projects: FieldValue.arrayUnion(projectRef.id) }, { merge: true });
    const snap = await projectRef.get();
    return NextResponse.json({ project: { id: projectRef.id, ...snap.data() } });
  } catch (error) {
    console.error("[api/projects] create failed:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
