import type { Attachment } from "@/lib/chat";

export interface ChatStreamEvent {
  event: "meta" | "data" | "memory" | "done" | "error";
  data: Record<string, unknown>;
}

export interface ChatRequest {
  message: string;
  userId: string;
  memoryMode: string;
  chatId?: string;
  projectId?: string;
  projectName?: string;
  userName?: string;
  attachments?: Attachment[];
  memories?: { content: string; type?: string }[];
  history?: { role: "user" | "assistant"; content: string }[];
}

/** POSTs to /api/chat and yields parsed SSE events. */
export async function* streamChat(
  payload: ChatRequest,
  token: string
): AsyncGenerator<ChatStreamEvent> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "Request failed";
    try {
      const json = (await response.json()) as { error?: string };
      message = json.error ?? message;
    } catch {
      /* ignore */
    }
    if (response.status === 429) {
      throw new Error(message);
    }
    throw new Error(message);
  }

  if (!response.body) {
    throw new Error("Streaming is not supported by this browser.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let pendingEvent = "data";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("event:")) {
        pendingEvent = trimmed.slice("event:".length).trim();
      } else if (trimmed.startsWith("data:")) {
        try {
          const data = JSON.parse(
            trimmed.slice("data:".length).trim()
          ) as Record<string, unknown>;
          yield { event: pendingEvent as ChatStreamEvent["event"], data };
        } catch {
          /* skip malformed frame */
        }
        pendingEvent = "data";
      }
    }
  }
}
