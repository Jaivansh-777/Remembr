import OpenAI from "openai";
import type {
  ChatCompletionOptions,
  StreamOptions,
  StreamProvider,
} from "@/lib/ai/types";

/**
 * Optional Claude provider (priority 4). Only activates when
 * `ANTHROPIC_API_KEY` is set. Uses Anthropic's OpenAI-compatible endpoint so
 * the existing OpenAI SDK + streaming generator can be reused.
 */
const CLAUDE_BASE_URL = "https://api.anthropic.com/v1";
const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-3-5-haiku-latest";

function claudeClient(apiKey: string) {
  return new OpenAI({
    apiKey,
    baseURL: CLAUDE_BASE_URL,
    defaultHeaders: { "x-api-key": apiKey },
  });
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

export const streamClaude: StreamProvider = async function* (opts: StreamOptions) {
  const client = claudeClient(opts.apiKey);
  const stream = await client.chat.completions.create(
    {
      model: opts.model ?? CLAUDE_MODEL,
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

export async function completeClaude(
  opts: ChatCompletionOptions
): Promise<string> {
  const client = claudeClient(opts.apiKey);
  const completion = await client.chat.completions.create(
    {
      model: opts.model ?? CLAUDE_MODEL,
      messages: toMessages(opts.system, opts.messages),
      stream: false,
    },
    { signal: opts.signal }
  );
  return completion.choices?.[0]?.message?.content ?? "";
}
