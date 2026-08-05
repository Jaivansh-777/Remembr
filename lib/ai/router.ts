import { streamGemini } from "@/lib/ai/providers/gemini";
import { streamGroq } from "@/lib/ai/providers/groq";
import { streamOpenRouter } from "@/lib/ai/providers/openrouter";
import type { AiTurn, StreamProvider } from "@/lib/ai/types";

interface ProviderConfig {
  name: string;
  envKey: string;
  model: string;
  stream: StreamProvider;
}

export const PROVIDERS: ProviderConfig[] = [
  {
    name: "gemini",
    envKey: "GOOGLE_AI_API_KEY",
    model: "gemini-3.1-flash-lite",
    stream: streamGemini,
  },
  {
    name: "groq",
    envKey: "GROQ_API_KEY",
    model: "llama-3.3-70b-versatile",
    stream: streamGroq,
  },
  {
    name: "openrouter-gemma",
    envKey: "OPENROUTER_API_KEY",
    model: "google/gemma-3-27b-it:free",
    stream: streamOpenRouter,
  },
  {
    name: "openrouter-llama",
    envKey: "OPENROUTER_API_KEY",
    model: "meta-llama/llama-3.3-70b-instruct:free",
    stream: streamOpenRouter,
  },
  {
    name: "openrouter-auto",
    envKey: "OPENROUTER_API_KEY",
    model: "openrouter/free",
    stream: streamOpenRouter,
  },
];

const MAX_FAILURES = 3;
const FAILURE_WINDOW_MS = 5 * 60 * 1000;
const COOLDOWN_MS = 60 * 1000;

interface CircuitState {
  failures: number[];
  cooldownUntil: number;
}

const circuit = new Map<string, CircuitState>();

function getState(name: string): CircuitState {
  let state = circuit.get(name);
  if (!state) {
    state = { failures: [], cooldownUntil: 0 };
    circuit.set(name, state);
  }
  return state;
}

function isOpen(name: string): boolean {
  const state = getState(name);
  if (Date.now() < state.cooldownUntil) return true;
  const now = Date.now();
  state.failures = state.failures.filter((t) => now - t < FAILURE_WINDOW_MS);
  return state.failures.length >= MAX_FAILURES;
}

function recordFailure(name: string) {
  const state = getState(name);
  const now = Date.now();
  state.failures.push(now);
  state.failures = state.failures.filter((t) => now - t < FAILURE_WINDOW_MS);
  if (state.failures.length >= MAX_FAILURES) {
    state.cooldownUntil = now + COOLDOWN_MS;
  }
  console.warn(
    `[router] ${name} failed (${state.failures.length}/${MAX_FAILURES} in window)${
      state.cooldownUntil > now ? ", cooling down 60s" : ""
    }`
  );
}

function recordSuccess(name: string) {
  getState(name).failures = [];
}

export type RouterEvent =
  | { type: "provider"; name: string }
  | { type: "text"; content: string }
  | { type: "error"; message: string };

export function hasConfiguredProvider(): boolean {
  return PROVIDERS.some((provider) => Boolean(process.env[provider.envKey]));
}

export async function* streamWithFallback(opts: {
  system?: string;
  messages: AiTurn[];
  signal?: AbortSignal;
}): AsyncGenerator<RouterEvent> {
  const available = PROVIDERS.filter(
    (provider) => process.env[provider.envKey] && !isOpen(provider.name)
  );

  if (available.length === 0) {
    console.error("[router] no available providers");
    yield {
      type: "error",
      message: "No AI providers are currently available. Please try again later.",
    };
    return;
  }

  let lastError: unknown = null;
  let started = false;

  for (const provider of available) {
    const apiKey = process.env[provider.envKey]!;
    try {
      const generator = provider.stream({
        apiKey,
        model: provider.model,
        system: opts.system,
        messages: opts.messages,
        signal: opts.signal,
      });

      yield { type: "provider", name: provider.name };

      for await (const chunk of generator) {
        started = true;
        if (chunk) yield { type: "text", content: chunk };
      }

      recordSuccess(provider.name);
      return;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw error;
      }
      lastError = error;
      recordFailure(provider.name);

      if (started) {
        yield {
          type: "error",
          message: "Connection lost while streaming. Please try again.",
        };
        return;
      }
    }
  }

  console.error("[router] all providers failed:", lastError);
  yield {
    type: "error",
    message: "All AI providers failed. Please try again later.",
  };
}
