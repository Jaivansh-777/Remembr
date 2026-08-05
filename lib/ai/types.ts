export interface AiTurn {
  role: "user" | "assistant";
  content: string;
}

export interface StreamOptions {
  apiKey: string;
  model: string;
  system?: string;
  messages: AiTurn[];
  signal?: AbortSignal;
}

export type StreamProvider = (opts: StreamOptions) => AsyncGenerator<string>;

export interface ChatCompletionOptions {
  apiKey: string;
  model: string;
  system?: string;
  messages: AiTurn[];
  signal?: AbortSignal;
}

export type ChatCompleter = (opts: ChatCompletionOptions) => Promise<string>;
