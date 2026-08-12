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
import { getMemoryLimitInfo } from "@/lib/trial-protection/server";
import { createId, type Attachment } from "@/lib/chat";
import { getFileDb } from "@/lib/db/files";
import { insertMemoriesDb } from "@/lib/db/memories";
import { insertMessageDb } from "@/lib/db/messages";
import { buildLearningProfileBlock, learnFromMessage } from "@/lib/learn";

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
  attachments?: Attachment[];
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

  const attachments = (body.attachments ?? []).filter(
    (attachment): attachment is Attachment =>
      Boolean(attachment) && typeof attachment.name === "string"
  );

  const message = body.message?.trim() ?? "";
  if (!message && attachments.length === 0) {
    return jsonResponse({ error: "Message is required" }, 400);
  }

  // Some clients send a fileId without extracted text. Pull the content from
  // the stored file record so every attachment can be answered from.
  if (attachments.length > 0) {
    const db = getAdminDb();
    await Promise.all(
      attachments.map(async (attachment) => {
        if (attachment.text || !attachment.fileId) return;
        // New files live in Postgres; legacy files in Firestore.
        const pgFile = await getFileDb(attachment.fileId, user.uid);
        if (pgFile) {
          if (!attachment.text && typeof pgFile.text === "string" && pgFile.text) {
            attachment.text = pgFile.text;
          }
          if (!attachment.summary && typeof pgFile.summary === "string") {
            attachment.summary = pgFile.summary;
          }
          if (!attachment.category && typeof pgFile.category === "string") {
            attachment.category = pgFile.category;
          }
          return;
        }
        if (!db) return;
        try {
          const snap = await db
            .collection("files")
            .doc(attachment.fileId)
            .get();
          if (!snap.exists) return;
          const data = snap.data() as Record<string, unknown>;
          if (!attachment.text && typeof data.text === "string" && data.text) {
            attachment.text = data.text;
          }
          if (!attachment.summary && typeof data.summary === "string") {
            attachment.summary = data.summary;
          }
          if (!attachment.category && typeof data.category === "string") {
            attachment.category = data.category;
          }
        } catch (error) {
          console.warn("[chat] failed to fetch file content:", error);
        }
      })
    );
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

  const personalization = await buildLearningProfileBlock(user.uid);
  await learnFromMessage(user.uid, message);

  const system = buildSystemPrompt({
    mode: body.memoryMode ?? "buddy",
    memories: body.memories ?? [],
    scope: body.projectId ? "team" : "personal",
    projectName: body.projectName,
    personalization: personalization ?? undefined,
    files: attachments.map((attachment) => ({
      name: attachment.name,
      category: attachment.category,
      summary: attachment.summary,
      size: attachment.size,
    })),
  });

  const history = (body.history ?? [])
    .filter((m) => m.content)
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content }));

  const fileContent = attachments
    .filter((attachment) => typeof attachment.text === "string" && attachment.text)
    .map(
      (attachment) =>
        `--- ${attachment.name} ---\n${String(attachment.text).slice(0, 4000)}`
    );
  const baseMessage =
    message ||
    (attachments.length > 0
      ? "Please analyze the attached file(s)."
      : "");
  const userMessage =
    fileContent.length > 0
      ? `${baseMessage}\n\n[ATTACHED FILE CONTENTS]\n${fileContent
          .join("\n\n")
          .slice(0, 16000)}`
      : baseMessage;

  const messages = [
    ...history,
    { role: "user" as const, content: userMessage },
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

        // Persist the exchange to Postgres (message history + chat row).
        const now = Date.now();
        if (body.chatId) {
          await insertMessageDb({
            id: createId(),
            chatId: body.chatId,
            userId: user.uid,
            role: "user",
            content: userMessage,
            attachments,
            createdAt: now,
          });
          if (fullResponse.trim()) {
            await insertMessageDb({
              id: createId(),
              chatId: body.chatId,
              userId: user.uid,
              role: "assistant",
              content: fullResponse,
              createdAt: now + 1,
            });
          }
        }

        const db = getAdminDb();
        let memoryLimitReached = false;
        if (db) {
          const info = await getMemoryLimitInfo(db, user.uid);
          memoryLimitReached = info.exceeded;
        }

        let extracted: ExtractedMemory[] = [];
        if (!memoryLimitReached && shouldStoreMemories(message)) {
          try {
            extracted = await extractMemories(
              `User: ${message}\n\nAssistant: ${fullResponse}`
            );
          } catch (error) {
            console.error("[chat] memory extraction failed:", error);
          }
        }

        let stored = false;
        if (extracted.length > 0) {
          // Postgres copy of the extracted memories (new canonical store).
          const memoryRows = extracted.map((memory) => ({
            id: createId(),
            userId: user.uid,
            projectId: body.projectId,
            chatId: body.chatId,
            content: memory.content,
            type: memory.type,
            confidence: 1,
            createdAt: Date.now(),
          }));
          const pgStored = await insertMemoriesDb(memoryRows);

          if (getAdminDb()) {
            try {
              const results = await Promise.all(
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
              stored = results.some(Boolean) || pgStored > 0;
            } catch (error) {
              console.error("[chat] vector store write failed:", error);
              stored = pgStored > 0;
            }
          } else {
            stored = pgStored > 0;
          }
        }

        if (extracted.length > 0 || memoryLimitReached) {
          send("memory", { memories: extracted, stored, limitReached: memoryLimitReached });
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
