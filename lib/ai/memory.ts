import { completeGemini } from "@/lib/ai/providers/gemini";
import { completeGroq } from "@/lib/ai/providers/groq";
import { completeOpenRouter } from "@/lib/ai/providers/openrouter";

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

/** Phrases that explicitly ask Remembr to *store* a memory. */
const STORE_PATTERNS = [
  /\bremember\b/i,
  /\b(?:don'?t|do not|never) (?:forget|lose)\b/i,
  /\bkeep (?:this|that )?in mind\b/i,
  /\bnote (?:this|that|it )?down\b/i,
  /\bsave (?:this|that|it)\b/i,
  /\bwrite (?:this|that|it) down\b/i,
  /\btake (?:a )?note\b/i,
  /\bstore this\b/i,
  /\bmark (?:this|that) down\b/i,
];

/**
 * Detects whether a user message explicitly asks Remembr to remember
 * something. Memories are only ever stored when this returns true.
 */
export function shouldStoreMemories(message: string): boolean {
  const text = message.trim();
  if (!text) return false;
  for (const pattern of RECALL_PATTERNS) {
    if (pattern.test(text)) return false;
  }
  return STORE_PATTERNS.some((pattern) => pattern.test(text));
}

const EXTRACTION_PROMPT = `Extract 1-3 key memories from this exchange that will be useful for future conversations.
Focus on: facts the user shared, preferences, decisions made, or ongoing projects.
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
          model: "google/gemma-3-27b-it:free",
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
}

/** Builds the system prompt that injects recalled memories. */
export function buildSystemPrompt(input: MemoryPromptInput): string {
  const mode = input.mode || "buddy";
  const memories = input.memories ?? [];
  const isTeam = input.scope === "team";

  let prompt = `You are Remembr, a memory-first AI assistant. You help users with their projects, code, documents, and ideas.`;

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
