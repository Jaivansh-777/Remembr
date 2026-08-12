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
  userName?: string;
  attachments?: Attachment[];
  memories?: { content: string; type?: string }[];
  history?: { role: "user" | "assistant"; content: string }[];
}

/** POSTs to /api/chat and yields parsed SSE events. */
export async function* streamChat(
  payload: ChatRequest,
  token: string,
  signal?: AbortSignal
): AsyncGenerator<ChatStreamEvent> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    signal,
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

export interface MemoryContextItem {
  id: string;
  content: string;
  type: string;
  createdAt: number;
}

/** Fetches recent / query-matched memories for chat context. */
export async function fetchMemories(
  token: string,
  opts: { query?: string; limit?: number } = {}
): Promise<MemoryContextItem[]> {
  const params = new URLSearchParams();
  if (opts.query) params.set("query", opts.query);
  if (opts.limit) params.set("limit", String(opts.limit));
  const response = await fetch(`/api/memories?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return [];
  const json = (await response.json()) as { memories?: MemoryContextItem[] };
  return json.memories ?? [];
}

/** Persists client-side memories (e.g. from file attachments) to Postgres. */
export async function storeMemoriesApi(
  token: string,
  opts: {
    memories: { content: string; type?: string }[];
    chatId?: string;
  }
): Promise<boolean> {
  const response = await fetch("/api/memories", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      memories: opts.memories,
      chatId: opts.chatId,
    }),
  });
  if (!response.ok) return false;
  const json = (await response.json()) as { stored?: number };
  return (json.stored ?? 0) > 0;
}

/** Sends a thumbs up/down (or clears it) for an assistant message. */
export async function sendFeedback(
  token: string,
  opts: {
    messageId: string;
    chatId?: string;
    value: 1 | -1 | 0;
  }
): Promise<boolean> {
  const response = await fetch("/api/feedback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messageId: opts.messageId,
      chatId: opts.chatId,
      value: opts.value,
    }),
  });
  if (!response.ok) return false;
  const json = (await response.json()) as { ok?: boolean };
  return json.ok === true;
}
