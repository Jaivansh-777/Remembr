export type MemoryMode = "goldfish" | "buddy" | "soulmate";

export interface MemoryModeOption {
  id: MemoryMode;
  label: string;
  emoji: string;
  hint: string;
}

export const MEMORY_MODES: MemoryModeOption[] = [
  {
    id: "goldfish",
    label: "Goldfish",
    emoji: "🐠",
    hint: "Fresh session — no memory",
  },
  {
    id: "buddy",
    label: "Buddy",
    emoji: "🤝",
    hint: "Remembers your last 3 sessions",
  },
  {
    id: "soulmate",
    label: "Soulmate",
    emoji: "❤️",
    hint: "Remembers everything — full context",
  },
];

export const MEMORY_MODE_LABEL: Record<MemoryMode, string> = {
  goldfish: "Goldfish",
  buddy: "Buddy",
  soulmate: "Soulmate",
};

export const SUGGESTIONS = [
  "Remember that I prefer clear, concise answers",
  "Don't forget my project deadline is next Friday",
  "Keep in mind I'm learning TypeScript",
  "What do you remember about me?",
  "Help me debug this code",
];

export interface Attachment {
  name: string;
  url: string;
  type: string;
  size: number;
  fileId?: string;
  category?: string;
  summary?: string;
  text?: string;
  processed?: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  attachments?: Attachment[];
}

export interface ChatDoc {
  id: string;
  userId: string;
  title: string;
  lastMessage: string;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
  archived: boolean;
  archivedAt?: number;
}

export function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createMessage(
  role: ChatMessage["role"],
  content: string,
  attachments?: Attachment[]
): ChatMessage {
  return {
    id: createId(),
    role,
    content,
    createdAt: Date.now(),
    attachments,
  };
}

export function toFirestoreTimestamp(value: number) {
  return { seconds: Math.floor(value / 1000), nanoseconds: 0 };
}

export function getMockReply(input: string, mode: MemoryMode): string {
  const q = input.toLowerCase();

  if (q.includes("remember") && q.includes("context")) {
    return `Saved to your ${MEMORY_MODE_LABEL[mode]} memory 🧠\n\nI've noted the project context you described. Next time we talk, I'll pick up right where we left off — no need to re-explain.`;
  }

  if (q.includes("last conversation")) {
    return `Your last conversation ended on a note about planning the Remembr chat experience. Here's the recap:\n\n• We designed the memory mode system (Goldfish / Buddy / Soulmate)\n• You wanted a ChatGPT-style interface with Remembr's purple branding\n\nWant me to continue from there?`;
  }

  if (q.includes("debug")) {
    return `Happy to help debug. Paste the code snippet and I'll walk through it line by line.\n\nTip: the most common causes are missing imports, stale state closures, and type mismatches. Share the code and error message and I'll pinpoint it.`;
  }

  if (q.includes("summarize")) {
    return `Here's a summary of your uploaded documents:\n\n• design-notes.pdf — 3 key decisions on brand colors\n• project-brief.md — goals for the MVP\n\nAsk me to expand on any section.`;
  }

  if (q.includes("find that thing") || q.includes("mentioned yesterday")) {
    return `I searched my ${MEMORY_MODE_LABEL[mode]} memory and found it:\n\nIt was the idea about auto-generating memory summaries at the end of each session. Want me to elaborate?`;
  }

  return `I've got that noted in ${MEMORY_MODE_LABEL[mode]} mode.\n\nOnce the AI backend is wired up, I'll give you a full response here. For now this simulates my answer — but my memory system is already tracking this conversation.`;
}

export const MAGIC_REPLY = `✨ Fresh idea from your memory:\n\nWhat if every conversation ended with an automatic memory digest? Remembr would summarize what you learned, what you decided, and what's next — then store it in your current memory mode. You'd never lose a thought again.`;
