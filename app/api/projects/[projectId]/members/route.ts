import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { requireAuth } from "@/lib/api/auth";
import { sendProjectInvite } from "@/lib/email";
import { getAdminDb } from "@/lib/firebase/admin";
import { generateInviteCode, getInviteUrl, toProjectDoc } from "@/lib/projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ projectId: string }>;
}

async function getProjectOrNull(
  db: NonNullable<ReturnType<typeof getAdminDb>>,
  projectId: string
) {
  const snap = await db.collection("projects").doc(projectId).get();
  return snap.exists
    ? toProjectDoc(snap.id, snap.data() as Record<string, unknown>)
    : null;
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const { projectId } = await params;
  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const project = await getProjectOrNull(db, projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const isOwner = project.ownerId === auth.user.uid;
    const isMember = project.members.includes(auth.user.uid);
    if (!isOwner && !isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const email = body.email?.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }

    const inviteCode = generateInviteCode();
    await db
      .collection("projects")
      .doc(projectId)
      .update({
        inviteCodes: FieldValue.arrayUnion(inviteCode),
        updatedAt: new Date(),
      });

    const inviteUrl = getInviteUrl(inviteCode);
    const emailSent = await sendProjectInvite({
      to: email,
      inviterName: auth.user.name ?? "A teammate",
      projectName: project.name,
      projectDescription: project.description,
      inviteUrl,
    });

    return NextResponse.json({ inviteUrl, emailSent });
  } catch (error) {
    console.error("[api/projects] invite failed:", error);
    return NextResponse.json({ error: "Failed to invite member" }, { status: 500 });
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
  let body: { userId?: string };
  try {
    body = (await request.json()) as { userId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const project = await getProjectOrNull(db, projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (project.ownerId !== auth.user.uid) {
      return NextResponse.json({ error: "Only the owner can remove members" }, { status: 403 });
    }

    const userId = body.userId?.trim();
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    if (userId === project.ownerId) {
      return NextResponse.json({ error: "The owner cannot be removed" }, { status: 400 });
    }

    await db
      .collection("projects")
      .doc(projectId)
      .update({
        members: FieldValue.arrayRemove(userId),
        updatedAt: new Date(),
      });
    await db
      .collection("users")
      .doc(userId)
      .set({ projects: FieldValue.arrayRemove(projectId) }, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/projects] remove member failed:", error);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}
