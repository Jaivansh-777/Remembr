import type { NextRequest } from "next/server";

import { extractBearerToken, verifyIdToken } from "@/lib/firebase/verify";
import { getAdminDb } from "@/lib/firebase/admin";
import { createId } from "@/lib/chat";
import {
  insertMemoriesDb,
  recentMemoriesDb,
  searchMemoriesDb,
} from "@/lib/db/memories";
import { getSql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

interface StoreMemoryBody {
  memories: { content: string; type?: string; confidence?: number }[];
  chatId?: string;
}

export async function GET(request: NextRequest) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const token = extractBearerToken(request.headers.get("authorization"));
  if (!token || !projectId) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  let user;
  try {
    user = await verifyIdToken(token, projectId);
  } catch {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() ?? "";
  const limit = Math.min(
    Number(searchParams.get("limit") ?? 50) || 50,
    200
  );

  // Postgres is the canonical store; fall back to Firestore if unconfigured.
  if (getSql()) {
    const rows = query
      ? await searchMemoriesDb(user.uid, query, limit)
      : await recentMemoriesDb(user.uid, limit);
    return jsonResponse({ memories: rows }, 200);
  }

  const db = getAdminDb();
  if (!db) return jsonResponse({ memories: [] }, 200);
  try {
    const snapshot = await db
      .collection("memories")
      .where("userId", "==", user.uid)
      .orderBy("timestamp", "desc")
      .limit(100)
      .get();
    const rows = snapshot.docs
      .map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        return {
          id: doc.id,
          userId: user.uid,
          content: String(data.content ?? ""),
          type: String(data.type ?? "fact"),
          confidence: 1,
          createdAt:
            data.timestamp && typeof (data.timestamp as { toMillis?: unknown }).toMillis === "function"
              ? (data.timestamp as { toMillis: () => number }).toMillis()
              : Date.now(),
        };
      })
      .filter((m) => !query || m.content.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
    return jsonResponse({ memories: rows }, 200);
  } catch (error) {
    console.error("[memories] firestore read failed:", error);
    return jsonResponse({ memories: [] }, 200);
  }
}

export async function POST(request: NextRequest) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const token = extractBearerToken(request.headers.get("authorization"));
  if (!token || !projectId) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  let user;
  try {
    user = await verifyIdToken(token, projectId);
  } catch {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: StoreMemoryBody;
  try {
    body = (await request.json()) as StoreMemoryBody;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const memories = (body.memories ?? [])
    .filter((m) => m && typeof m.content === "string" && m.content.trim())
    .map((m) => ({
      id: createId(),
      userId: user.uid,
      chatId: body.chatId ?? null,
      content: m.content.trim(),
      type: m.type ?? "fact",
      confidence: m.confidence ?? 1,
      createdAt: Date.now(),
    }));
  if (memories.length === 0) {
    return jsonResponse({ error: "No memories provided" }, 400);
  }

  const stored = await insertMemoriesDb(memories);
  return jsonResponse({ stored: memories.length, persisted: stored }, 200);
}
