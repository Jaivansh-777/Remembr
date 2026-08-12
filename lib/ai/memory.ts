import { completeGemini } from "@/lib/ai/providers/gemini";
import { completeGroq } from "@/lib/ai/providers/groq";
import { completeOpenRouter } from "@/lib/ai/providers/openrouter";
import { festivalCalendarBlock } from "@/lib/festivals";

export type ExtractedMemoryType =
  | "fact"
  | "preference"
  | "decision"
  | "project_update"
  | "tone"
  | "project"
  | "attachment";

export interface ExtractedMemory {
  type: ExtractedMemoryType;
  content: string;
}

/** Phrases that ask Remembr to *recall* something (never trigger storage). */
const RECALL_PATTERNS = [
  /\bdo you remember\b/i,
  /\bdid you remember\b/i,
  /\bdo you recall\b/i,
  /\bdo you know\b/i,
  /\byou remember\b/i,
  /\b(?:i|we) (?:don'?t|do not|can'?t|cannot|won'?t) remember\b/i,
  /\bwhat.*(?:remember|forgot)\b/i,
];

/**
 * Decides whether to try extracting memories from an exchange.
 * Memories are auto-extracted from every exchange EXCEPT pure recall /
 * acknowledgement messages — this is what lets Remembr remember things like
 * "my dog is Buzo" even without the user explicitly saying "remember".
 */
export function shouldStoreMemories(message: string): boolean {
  const text = message.trim();
  if (!text) return false;
  for (const pattern of RECALL_PATTERNS) {
    if (pattern.test(text)) return false;
  }
  return true;
}

const EXTRACTION_PROMPT = `Extract 1-3 key memories from this exchange that will be useful for future conversations.
Capture facts the user shares about themselves (names, pets, family, job, likes, dislikes), preferences, decisions made, and ongoing projects.
Include small personal details even if they seem minor — they matter for future recall.
Return ONLY a JSON array, no other text, in this exact shape:
[{"type":"fact|preference|decision|project_update|tone|project|attachment","content":"..."}]`;

function normalizeType(type: string | null | undefined): ExtractedMemoryType {
  const value = String(type ?? "").toLowerCase();
  if (
    [
      "fact",
      "preference",
      "decision",
      "project_update",
      "tone",
      "project",
      "attachment",
    ].includes(value)
  ) {
    return value as ExtractedMemoryType;
  }
  return "fact";
}

function parseExtraction(raw: string): ExtractedMemory[] {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();

  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end <= start) return [];

  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item) =>
          item &&
          typeof item === "object" &&
          typeof (item as { content?: unknown }).content === "string" &&
          String((item as { content: string }).content).trim().length > 0
      )
      .map((item) => ({
        type: normalizeType((item as { type?: string }).type),
        content: String((item as { content: string }).content)
          .trim()
          .slice(0, 500),
      }));
  } catch {
    return [];
  }
}

/** Runs memory extraction through the cheap-model fallback chain. */
export async function extractMemories(
  exchange: string
): Promise<ExtractedMemory[]> {
  const candidates: {
    key: string;
    fn: () => Promise<string>;
  }[] = [];

  const geminiKey = process.env.GOOGLE_AI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  if (geminiKey) {
    candidates.push({
      key: "gemini",
      fn: () =>
        completeGemini({
          apiKey: geminiKey,
          model: "gemini-3.1-flash-lite",
          system: EXTRACTION_PROMPT,
          messages: [{ role: "user", content: exchange }],
        }),
    });
  }
  if (groqKey) {
    candidates.push({
      key: "groq",
      fn: () =>
        completeGroq({
          apiKey: groqKey,
          model: "llama-3.3-70b-versatile",
          system: EXTRACTION_PROMPT,
          messages: [{ role: "user", content: exchange }],
        }),
    });
  }
  if (openRouterKey) {
    candidates.push({
      key: "openrouter",
      fn: () =>
        completeOpenRouter({
          apiKey: openRouterKey,
          model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
          system: EXTRACTION_PROMPT,
          messages: [{ role: "user", content: exchange }],
        }),
    });
  }
  const openRouterFallbackKey = process.env.OPENROUTER_API_KEY_FALLBACK;
  if (openRouterFallbackKey) {
    candidates.push({
      key: "openrouter-fallback",
      fn: () =>
        completeOpenRouter({
          apiKey: openRouterFallbackKey,
          model: "google/gemma-4-26b-a4b-it:free",
          system: EXTRACTION_PROMPT,
          messages: [{ role: "user", content: exchange }],
        }),
    });
  }
  const openRouterFreeKey =
    process.env.OPENROUTER_FREE_API_KEY ?? process.env.OPENROUTER_API_KEY;
  if (openRouterFreeKey) {
    candidates.push({
      key: "openrouter-free",
      fn: () =>
        completeOpenRouter({
          apiKey: openRouterFreeKey,
          model: "openrouter/free",
          system: EXTRACTION_PROMPT,
          messages: [{ role: "user", content: exchange }],
        }),
    });
  }

  for (const candidate of candidates) {
    try {
      const raw = await candidate.fn();
      const memories = parseExtraction(raw);
      if (memories.length > 0) {
        console.log(`[memory] extracted ${memories.length} via ${candidate.key}`);
        return memories;
      }
    } catch (error) {
      console.warn(`[memory] extraction via ${candidate.key} failed:`, error);
    }
  }
  return [];
}

export interface MemoryPromptInput {
  mode: string;
  memories: { content: string; type?: string }[];
  recentContext?: string[];
  scope?: "personal" | "team";
  projectName?: string;
  files?: { name: string; category?: string; summary?: string; size?: number }[];
}

/** Builds the system prompt that injects recalled memories. */
export function buildSystemPrompt(input: MemoryPromptInput): string {
  const mode = input.mode || "buddy";
  const memories = input.memories ?? [];
  const isTeam = input.scope === "team";
  const files = input.files ?? [];

  let prompt = `You are Remembr, a memory-first AI assistant. You help users with their projects, code, documents, and ideas.`;

  const now = new Date();
  prompt += `\n\n[CURRENT DATE]\nThe current date and time is: ${now.toISOString()} (Year: ${now.getFullYear()}). Always treat this as "now" when answering questions about dates, times, the current year, or how long ago something happened. Never assume the current year from your training data — it is ${now.getFullYear()}, not any year in your training cutoff.`;

  prompt += `\n\n${festivalCalendarBlock()}`;

  if (memories.length > 0 && mode !== "goldfish") {
    const header = isTeam
      ? `\n\n[TEAM MEMORIES]\nHere are shared memories${input.projectName ? ` for the project "${input.projectName}"` : ""} gathered from team conversations:\n`
      : `\n\n[USER MEMORIES]\nHere are key facts about this user from previous conversations:\n`;
    prompt += `${header}${memories
      .map((memory, index) => `${index + 1}. ${memory.content}`)
      .join("\n")}`;
  }

  if (input.recentContext && input.recentContext.length > 0) {
    prompt += `\n\n[RECENT CONTEXT]\nLast conversations discussed: ${input.recentContext.join(
      ", "
    )}.`;
  }

  if (files.length > 0) {
    prompt += `\n\n[FILE REFERENCES]\nThe user has attached the following files to this message. Use their summaries and content to answer questions about them:\n${files
      .map(
        (file, index) =>
          `${index + 1}. ${file.name}${
            file.category ? ` (${file.category})` : ""
          }${file.size ? ` — ${file.size} bytes` : ""}${
            file.summary ? ` — ${file.summary}` : ""
          }`
      )
      .join("\n")}`;
  }

  prompt += `\n\n[INSTRUCTION]\nUse these memories to provide personalized, contextual responses. Never contradict these facts unless the user explicitly changes them.`;

  if (isTeam) {
    prompt += `\nYou are operating in a shared team workspace${input.projectName ? ` (${input.projectName})` : ""}. Treat team memories as shared knowledge owned by the whole team. When recalling, reference that the team decided or shared this context.`;
  }

  if (mode === "goldfish") {
    prompt += `\nThis session is in Goldfish mode: treat it as a fresh session with no prior memory.`;
  } else if (mode === "buddy") {
    prompt += `\nThis session is in Buddy mode: you remember recent context.`;
  } else {
    prompt += `\nThis session is in Soulmate mode: recall as much context as possible for a deep, personal response.`;
  }

  prompt += `\nKeep responses helpful and concise.`;
  return prompt;
}
