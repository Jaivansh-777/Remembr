import { completeGemini } from "@/lib/ai/providers/gemini";
import { completeGroq } from "@/lib/ai/providers/groq";
import { completeOpenRouter } from "@/lib/ai/providers/openrouter";

export type ExtractedMemoryType =
  | "fact"
  | "preference"
  | "tone"
  | "project"
  | "attachment";

export interface ExtractedMemory {
  type: ExtractedMemoryType;
  content: string;
}

const EXTRACTION_PROMPT = `Extract 1-3 key memories from this exchange that will be useful for future conversations.
Focus on: facts the user shared, preferences, ongoing projects, or emotional tone.
Return ONLY a JSON array, no other text, in this exact shape:
[{"type":"fact|preference|tone|project|attachment","content":"..."}]`;

function normalizeType(type: string | null | undefined): ExtractedMemoryType {
  const value = String(type ?? "").toLowerCase();
  if (["fact", "preference", "tone", "project", "attachment"].includes(value)) {
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
}

/** Builds the system prompt that injects recalled memories. */
export function buildSystemPrompt(input: MemoryPromptInput): string {
  const mode = input.mode || "buddy";
  const memories = input.memories ?? [];

  let prompt = `You are Remembr, a memory-first AI assistant. You help users with their projects, code, documents, and ideas.`;

  if (memories.length > 0 && mode !== "goldfish") {
    prompt += `\n\n[USER MEMORIES]\nHere are key facts about this user from previous conversations:\n${memories
      .map((memory, index) => `${index + 1}. ${memory.content}`)
      .join("\n")}`;
  }

  if (input.recentContext && input.recentContext.length > 0) {
    prompt += `\n\n[RECENT CONTEXT]\nLast conversations discussed: ${input.recentContext.join(
      ", "
    )}.`;
  }

  prompt += `\n\n[INSTRUCTION]\nUse these memories to provide personalized, contextual responses. Never contradict these facts unless the user explicitly changes them.`;

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
