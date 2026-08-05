import OpenAI from "openai";
import type {
  ChatCompletionOptions,
  StreamOptions,
  StreamProvider,
} from "@/lib/ai/types";

const BASE_URL = "https://openrouter.ai/api/v1";

function toMessages(system: string | undefined, messages: StreamOptions["messages"]) {
  const systemMessage = system
    ? [{ role: "system" as const, content: system }]
    : [];
  return [
    ...systemMessage,
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];
}

export const streamOpenRouter: StreamProvider = async function* (opts: StreamOptions) {
  const client = new OpenAI({ apiKey: opts.apiKey, baseURL: BASE_URL });
  const stream = await client.chat.completions.create(
    {
      model: opts.model,
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

export async function completeOpenRouter(
  opts: ChatCompletionOptions
): Promise<string> {
  const client = new OpenAI({ apiKey: opts.apiKey, baseURL: BASE_URL });
  const completion = await client.chat.completions.create(
    {
      model: opts.model,
      messages: toMessages(opts.system, opts.messages),
      stream: false,
    },
    { signal: opts.signal }
  );
  return completion.choices?.[0]?.message?.content ?? "";
}
