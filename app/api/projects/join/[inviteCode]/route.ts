import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { requireAuth } from "@/lib/api/auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { toProjectDoc } from "@/lib/projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ inviteCode: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const { inviteCode } = await params;
  try {
    const snapshot = await db
      .collection("projects")
      .where("inviteCodes", "array-contains", inviteCode)
      .limit(1)
      .get();
    if (snapshot.empty) {
      return NextResponse.json({ error: "Invite code is invalid or expired" }, { status: 404 });
    }

    const projectSnap = snapshot.docs[0];
    const project = toProjectDoc(
      projectSnap.id,
      projectSnap.data() as Record<string, unknown>
    );
    const members: string[] = project.members;
    const uid = auth.user.uid;

    if (project.ownerId !== uid && !members.includes(uid)) {
      await db.collection("projects").doc(project.id).update({
        members: FieldValue.arrayUnion(uid),
        updatedAt: new Date(),
      });
      await db
        .collection("users")
        .doc(uid)
        .set({ projects: FieldValue.arrayUnion(project.id) }, { merge: true });
    }

    return NextResponse.json({
      project: { id: project.id, name: project.name, description: project.description },
    });
  } catch (error) {
    console.error("[api/projects] join failed:", error);
    return NextResponse.json({ error: "Failed to join project" }, { status: 500 });
  }
}
