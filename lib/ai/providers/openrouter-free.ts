import {
  completeOpenRouter,
  streamOpenRouter,
} from "@/lib/ai/providers/openrouter";
import type { ChatCompleter, StreamProvider } from "@/lib/ai/types";

/**
 * OpenRouter's /free model router — the ultimate fallback in the provider
 * chain. Instead of pinning a single model, it automatically routes each
 * request to any free model on OpenRouter that can handle it, so it never
 * runs out (there is always at least one free model available).
 *
 * Key resolution: dedicated `OPENROUTER_FREE_API_KEY` first, otherwise the
 * primary `OPENROUTER_API_KEY`.
 */
export const OPENROUTER_FREE_MODEL = "openrouter/free";

export const OPENROUTER_FREE_PRIORITY = 6;

export const OPENROUTER_FREE_ENV_KEY = "OPENROUTER_FREE_API_KEY";

export function resolveOpenRouterFreeKey(): string | undefined {
  return (
    process.env[OPENROUTER_FREE_ENV_KEY] ?? process.env.OPENROUTER_API_KEY
  );
}

/** Streaming via the OpenRouter client with the /free router model. */
export const streamOpenRouterFree: StreamProvider = streamOpenRouter;

/** Non-streaming completion (used for memory extraction / file analysis). */
export const completeOpenRouterFree: ChatCompleter = completeOpenRouter;
