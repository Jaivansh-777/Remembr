import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  AiTurn,
  ChatCompletionOptions,
  StreamOptions,
  StreamProvider,
} from "@/lib/ai/types";

function toGeminiContents(messages: AiTurn[]) {
  return messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));
}

export const streamGemini: StreamProvider = async function* (opts: StreamOptions) {
  const genAI = new GoogleGenerativeAI(opts.apiKey);
  const model = genAI.getGenerativeModel({ model: opts.model });
  const result = await model.generateContentStream({
    contents: toGeminiContents(opts.messages),
    systemInstruction: opts.system,
  });
  for await (const chunk of result.stream) {
    const text = chunk.text?.();
    if (text) yield text;
  }
};

/** Non-streaming completion used for memory extraction. */
export async function completeGemini(
  opts: ChatCompletionOptions
): Promise<string> {
  const genAI = new GoogleGenerativeAI(opts.apiKey);
  const model = genAI.getGenerativeModel({ model: opts.model });
  const result = await model.generateContent({
    contents: toGeminiContents(opts.messages),
    systemInstruction: opts.system,
  });
  return result.response.text();
}
