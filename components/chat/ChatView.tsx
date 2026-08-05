"use client";

import { Sparkles } from "lucide-react";

import { ChatInput } from "@/components/chat/ChatInput";
import { MessageList } from "@/components/chat/MessageList";
import { SUGGESTIONS, type Attachment, type ChatMessage } from "@/lib/chat";

interface ChatViewProps {
  messages: ChatMessage[];
  streaming?: string | null;
  thinking?: boolean;
  userId?: string | null;
  onSend: (text: string, attachments: Attachment[]) => void;
  onMagic: () => void;
  onPickSuggestion: (text: string) => void;
}

export function ChatView({
  messages,
  streaming,
  thinking,
  userId,
  onSend,
  onMagic,
  onPickSuggestion,
}: ChatViewProps) {
  const isEmpty = messages.length === 0 && !streaming && !thinking;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col overflow-hidden">
        <MessageList
          messages={messages}
          streaming={streaming}
          thinking={thinking}
          empty={<EmptyState onPickSuggestion={onPickSuggestion} />}
        />
      </div>

      <div className="border-t border-white/5 bg-[#0A0A0A] px-4 pt-3 pb-4 sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
          {isEmpty ? (
            <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => onPickSuggestion(suggestion)}
                  className="cursor-pointer rounded-full border border-white/10 bg-[#1A1A1A] px-3 py-1.5 text-xs text-[#C4B5FD] transition-all hover:border-[#7C3AED]/50 hover:bg-[#7C3AED]/10 hover:text-white"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}
          <ChatInput
            onSend={onSend}
            onMagic={onMagic}
            disabled={Boolean(thinking || streaming)}
            userId={userId}
          />
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  onPickSuggestion,
}: {
  onPickSuggestion: (text: string) => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="relative">
        <div className="absolute inset-0 -z-10 animate-pulse rounded-full bg-[#7C3AED]/40 blur-2xl" />
        <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] shadow-[0_0_36px_rgba(124,58,237,0.6)]">
          <Sparkles className="size-7 text-white" />
        </span>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          🧠 Remembr is ready
        </h2>
        <p className="text-sm text-[#A1A1A1]">
          Your AI remembers everything. Start a conversation.
        </p>
      </div>
      <div className="flex max-w-xl flex-wrap items-center justify-center gap-2">
        {SUGGESTIONS.slice(0, 4).map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onPickSuggestion(suggestion)}
            className="cursor-pointer rounded-full border border-white/10 bg-[#1A1A1A] px-3.5 py-2 text-xs text-[#C4B5FD] transition-all hover:border-[#7C3AED]/50 hover:bg-[#7C3AED]/10 hover:text-white sm:text-sm"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
