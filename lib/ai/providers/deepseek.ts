import OpenAI from "openai";
import type {
  ChatCompletionOptions,
  StreamOptions,
  StreamProvider,
} from "@/lib/ai/types";

/**
 * Optional DeepSeek provider (priority 5). Only activates when
 * `DEEPSEEK_API_KEY` is set. DeepSeek exposes an OpenAI-compatible API.
 */
const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";

function deepSeekClient(apiKey: string) {
  return new OpenAI({ apiKey, baseURL: DEEPSEEK_BASE_URL });
}

function toMessages(system: string | undefined, messages: StreamOptions["messages"]) {
  const systemMessage = system
    ? [{ role: "system" as const, content: system }]
    : [];
  return [
    ...systemMessage,
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];
}

export const streamDeepSeek: StreamProvider = async function* (opts: StreamOptions) {
  const client = deepSeekClient(opts.apiKey);
  const stream = await client.chat.completions.create(
    {
      model: opts.model ?? DEEPSEEK_MODEL,
      messages: toMessages(opts.system, opts.messages),
      stream: true,
    },
    { signal: opts.signal }
  );
  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) yield delta;
  }
};

export async function completeDeepSeek(
  opts: ChatCompletionOptions
): Promise<string> {
  const client = deepSeekClient(opts.apiKey);
  const completion = await client.chat.completions.create(
    {
      model: opts.model ?? DEEPSEEK_MODEL,
      messages: toMessages(opts.system, opts.messages),
      stream: false,
    },
    { signal: opts.signal }
  );
  return completion.choices?.[0]?.message?.content ?? "";
}
