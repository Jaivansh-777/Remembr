import type { NextRequest } from "next/server";

import { extractBearerToken, verifyIdToken } from "@/lib/firebase/verify";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  checkServerQuota,
  incrementServerQuota,
} from "@/lib/rate-limit/server";
import {
  buildSystemPrompt,
  extractMemories,
  shouldStoreMemories,
  type ExtractedMemory,
} from "@/lib/ai/memory";
import { hasConfiguredProvider, streamWithFallback } from "@/lib/ai/router";
import { vectorStore } from "@/lib/vector";
import { createId } from "@/lib/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChatRequestBody {
  message: string;
  userId: string;
  memoryMode?: string;
  chatId?: string;
  projectId?: string;
  projectName?: string;
  userName?: string;
  attachments?: string[];
  memories?: { content: string; type?: string }[];
  history?: { role: "user" | "assistant"; content: string }[];
}

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
    console.warn("[chat] token verification failed:", error);
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (body.userId !== user.uid) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  const message = body.message?.trim() ?? "";
  if (!message) {
    return jsonResponse({ error: "Message is required" }, 400);
  }

  const quota = await checkServerQuota(user.uid, "free");
  if (!quota.ok) {
    return jsonResponse(
      { error: "Daily limit reached. Upgrade or try again tomorrow.", quota },
      429
    );
  }

  if (!hasConfiguredProvider()) {
    return jsonResponse(
      { error: "AI providers are not configured on the server." },
      500
    );
  }

  const system = buildSystemPrompt({
    mode: body.memoryMode ?? "buddy",
    memories: body.memories ?? [],
    scope: body.projectId ? "team" : "personal",
    projectName: body.projectName,
  });

  const history = (body.history ?? [])
    .filter((m) => m.content)
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content }));
  const messages = [
    ...history,
    { role: "user" as const, content: message },
  ];

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        let fullResponse = "";
        let currentProvider: string | null = null;

        for await (const event of streamWithFallback({
          system,
          messages,
          signal: request.signal,
        })) {
          if (event.type === "provider") {
            currentProvider = event.name;
            send("meta", { provider: event.name });
          } else if (event.type === "text") {
            fullResponse += event.content;
            send("data", { text: event.content });
          } else if (event.type === "error") {
            send("error", { message: event.message });
          }
        }

        await incrementServerQuota(user.uid);

        let extracted: ExtractedMemory[] = [];
        if (shouldStoreMemories(message)) {
          try {
            extracted = await extractMemories(
              `User: ${message}\n\nAssistant: ${fullResponse}`
            );
          } catch (error) {
            console.error("[chat] memory extraction failed:", error);
          }
        }

        let stored = false;
        if (extracted.length > 0 && getAdminDb()) {
          try {
            await Promise.all(
              extracted.map((memory) =>
                vectorStore.add({
                  id: createId(),
                  userId: user.uid,
                  userName: body.userName,
                  content: memory.content,
                  type: memory.type,
                  chatId: body.chatId,
                  projectId: body.projectId,
                  timestamp: Date.now(),
                })
              )
            );
            stored = true;
          } catch (error) {
            console.error("[chat] vector store write failed:", error);
          }
        }

        if (extracted.length > 0) {
          send("memory", { memories: extracted, stored });
        }
        send("done", { provider: currentProvider });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        console.error("[chat] stream error:", error);
        send("error", { message: "Something went wrong. Please try again." });
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
