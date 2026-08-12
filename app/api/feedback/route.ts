import type { NextRequest } from "next/server";

import { extractBearerToken, verifyIdToken } from "@/lib/firebase/verify";
import { upsertFeedbackDb } from "@/lib/db/feedback";
import { learnFromFeedback } from "@/lib/learn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
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
  } catch (error) {
    console.warn("[feedback] token verification failed:", error);
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: { messageId?: unknown; chatId?: unknown; value?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (typeof body.messageId !== "string" || !body.messageId) {
    return jsonResponse({ error: "messageId is required" }, 400);
  }
  const value = Number(body.value);
  if (!Number.isInteger(value) || value < -1 || value > 1) {
    return jsonResponse({ error: "value must be -1, 0 or 1" }, 400);
  }
  const chatId = typeof body.chatId === "string" ? body.chatId : undefined;

  const result = await upsertFeedbackDb({
    userId: user.uid,
    chatId,
    messageId: body.messageId,
    value,
  });
  if (!result) {
    return jsonResponse({ error: "Failed to save feedback" }, 500);
  }

  const prev = result.previous;
  const delta = {
    up: (value > 0 ? 1 : 0) - (prev > 0 ? 1 : 0),
    down: (value < 0 ? 1 : 0) - (prev < 0 ? 1 : 0),
    score:
      ((value > 0 ? 1 : value < 0 ? -1 : 0) -
        (prev > 0 ? 1 : prev < 0 ? -1 : 0)) *
      0.15,
  };
  await learnFromFeedback(user.uid, delta);

  return jsonResponse({ ok: true, value }, 200);
}
