import Groq from "groq-sdk";
import type {
  ChatCompletionOptions,
  StreamOptions,
  StreamProvider,
} from "@/lib/ai/types";

function toGroqMessages(system: string | undefined, messages: StreamOptions["messages"]) {
  const systemMessage = system
    ? [{ role: "system" as const, content: system }]
    : [];
  return [
    ...systemMessage,
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];
}

export const streamGroq: StreamProvider = async function* (opts: StreamOptions) {
  const client = new Groq({ apiKey: opts.apiKey });
  const stream = await client.chat.completions.create(
    {
      model: opts.model,
      messages: toGroqMessages(opts.system, opts.messages),
      stream: true,
    },
    { signal: opts.signal }
  );
  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) yield delta;
  }
};

export async function completeGroq(
  opts: ChatCompletionOptions
): Promise<string> {
  const client = new Groq({ apiKey: opts.apiKey });
  const completion = await client.chat.completions.create(
    {
      model: opts.model,
      messages: toGroqMessages(opts.system, opts.messages),
      stream: false,
    },
    { signal: opts.signal }
  );
  return completion.choices?.[0]?.message?.content ?? "";
}
