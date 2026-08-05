import { GoogleGenerativeAI } from "@google/generative-ai";

import { analyzeContent } from "@/lib/file-processing/summarizer";
import type { FileCategory } from "@/lib/file-types";

export interface ImageData {
  text: string;
  summary: string;
  facts: string[];
  keywords: string[];
  metadata: Record<string, unknown>;
}

const VISION_PROMPT = `Analyze this image and return ONLY a JSON object, no other text, in this exact shape:
{"ocr":"All readable text extracted from the image ("" if none)","objects":["detected objects/people"],"scene":"brief scene description","faces":["emotions/mood if people present, else []"],"colors":"dominant colors and composition","summary":"2-3 sentence summary of the image content"}`;

/** Runs Gemini vision; falls back to metadata-only when no key or the model rejects the image. */
export async function processImage(
  buffer: Buffer,
  mimeType: string
): Promise<ImageData> {
  const metadata: Record<string, unknown> = { mimeType };
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  const base64 = buffer.toString("base64");

  if (apiKey && buffer.byteLength <= 4 * 1024 * 1024) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite",
      });
      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              { text: VISION_PROMPT },
              { inlineData: { mimeType, data: base64 } },
            ],
          },
        ],
      });
      const raw = result.response.text();
      const parsed = parseVision(raw);
      if (parsed) {
        const ocr = parsed.ocr ?? "";
        const scene = parsed.scene ?? "";
        const analysis = await analyzeContent(
          ocr || scene,
          "image",
          "image" as FileCategory,
          [
            scene && `Scene: ${scene}`,
            parsed.objects?.length
              ? `Objects: ${parsed.objects.join(", ")}`
              : "",
            parsed.faces?.length ? `Faces/emotions: ${parsed.faces.join(", ")}` : "",
            parsed.colors ? `Colors/composition: ${parsed.colors}` : "",
          ]
            .filter(Boolean)
            .join("\n")
        );
        return {
          text: ocr,
          summary: parsed.summary ?? analysis.summary,
          facts: analysis.facts,
          keywords: analysis.keywords,
          metadata: {
            ...metadata,
            objects: parsed.objects ?? [],
            scene,
            faces: parsed.faces ?? [],
            colors: parsed.colors ?? "",
          },
        };
      }
    } catch (error) {
      console.warn("[file-processing] vision failed:", error);
    }
  }

  if (!apiKey) {
    metadata.warning = "Vision API not configured; no OCR available.";
  }
  return { text: "", summary: "", facts: [], keywords: [], metadata };
}

interface VisionParse {
  ocr?: string;
  objects?: string[];
  scene?: string;
  faces?: string[];
  colors?: string;
  summary?: string;
}

function parseVision(raw: string): VisionParse | null {
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
    return {
      ocr: typeof parsed.ocr === "string" ? parsed.ocr : "",
      objects: Array.isArray(parsed.objects)
        ? parsed.objects.map(String)
        : [],
      scene: typeof parsed.scene === "string" ? parsed.scene : "",
      faces: Array.isArray(parsed.faces) ? parsed.faces.map(String) : [],
      colors: typeof parsed.colors === "string" ? parsed.colors : "",
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
    };
  } catch {
    return null;
  }
}
