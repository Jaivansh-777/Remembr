import { completeGemini } from "@/lib/ai/providers/gemini";
import { completeGroq } from "@/lib/ai/providers/groq";
import { completeOpenRouter } from "@/lib/ai/providers/openrouter";
import type { FileCategory } from "@/lib/file-types";

export interface AnalysisResult {
  summary: string;
  facts: string[];
  keywords: string[];
}

const STOPWORDS = new Set([
  "the", "and", "for", "with", "this", "that", "from", "have", "has", "are",
  "was", "were", "will", "would", "could", "should", "their", "there", "which",
  "what", "when", "where", "than", "then", "them", "they", "your", "you", "our",
  "about", "into", "been", "being", "each", "other", "some", "such", "only",
  "more", "most", "very", "just", "also", "not", "but", "its", "it's", "all",
  "any", "can", "out", "over", "under", "upon", "while", "because", "between",
]);

const MAX_TEXT_FOR_ANALYSIS = 16000;

function truncate(text: string, max: number): string {
  const value = text.trim().replace(/\s+/g, " ");
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

function keywordFallback(text: string): string[] {
  const counts = new Map<string, number>();
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .forEach((word) => {
      if (word.length <= 3 || STOPWORDS.has(word) || /^\d+$/.test(word)) return;
      counts.set(word, (counts.get(word) ?? 0) + 1);
    });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
}

function factFallback(text: string): string[] {
  const sentences = text
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && s.length < 280);
  const interesting = sentences.filter((sentence) =>
    /\d|%|\$|€|£|\d{1,2}\/\d{1,2}|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(
      sentence
    )
  );
  const pool = interesting.length >= 2 ? interesting : sentences;
  return pool.slice(0, 5);
}

function fallbackAnalysis(text: string): AnalysisResult {
  return {
    summary: truncate(text, 400),
    facts: factFallback(text),
    keywords: keywordFallback(text),
  };
}

function parseAnalysis(raw: string): AnalysisResult | null {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as Record<
      string,
      unknown
    >;
    const summary = String(parsed.summary ?? "").trim();
    if (!summary) return null;
    const facts = Array.isArray(parsed.facts)
      ? parsed.facts
          .filter((f): f is string => typeof f === "string" && f.trim().length > 0)
          .map((f) => f.trim())
          .slice(0, 6)
      : [];
    const keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords
          .filter((k): k is string => typeof k === "string" && k.trim().length > 0)
          .map((k) => k.trim())
          .slice(0, 8)
      : [];
    return { summary, facts, keywords };
  } catch {
    return null;
  }
}

const ANALYSIS_PROMPT = `You analyze extracted file content and return a structured summary.
Return ONLY a JSON object, no other text, in this exact shape:
{"summary":"A 2-4 sentence summary of the most important content (max 200 words)","facts":["Key fact / number / date / decision as a short string"],"keywords":["5-8 topical keywords"]}`;

/** Runs content analysis through the model fallback chain, falling back to heuristics. */
export async function analyzeContent(
  text: string,
  fileName: string,
  category: FileCategory,
  extraContext?: string
): Promise<AnalysisResult> {
  const body = [
    `File name: ${fileName}`,
    `Category: ${category}`,
    extraContext ? `Additional details: ${extraContext}` : "",
    `\n--- EXTRACTED CONTENT ---\n${truncate(text, MAX_TEXT_FOR_ANALYSIS)}`,
  ]
    .filter(Boolean)
    .join("\n");

  const candidates: { key: string; fn: () => Promise<string> }[] = [];
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
          system: ANALYSIS_PROMPT,
          messages: [{ role: "user", content: body }],
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
          system: ANALYSIS_PROMPT,
          messages: [{ role: "user", content: body }],
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
          system: ANALYSIS_PROMPT,
          messages: [{ role: "user", content: body }],
        }),
    });
  }

  for (const candidate of candidates) {
    try {
      const raw = await candidate.fn();
      const analysis = parseAnalysis(raw);
      if (analysis) {
        console.log(`[file-analysis] analyzed via ${candidate.key}`);
        return analysis;
      }
    } catch (error) {
      console.warn(`[file-analysis] via ${candidate.key} failed:`, error);
    }
  }
  return fallbackAnalysis(text);
}
