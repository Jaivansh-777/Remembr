"use client";

import { ChatInput } from "@/components/chat/ChatInput";
import { EmptyState } from "@/components/chat/EmptyState";
import { MessageList } from "@/components/chat/MessageList";
import type { Attachment, ChatMessage } from "@/lib/chat";

interface ChatViewProps {
  messages: ChatMessage[];
  streaming?: string | null;
  thinking?: boolean;
  userId?: string | null;
  onSend: (text: string, attachments: Attachment[]) => void;
  onStop: () => void;
  onMagic: () => void;
  onPickSuggestion: (text: string) => void;
}

export function ChatView({
  messages,
  streaming,
  thinking,
  userId,
  onSend,
  onStop,
  onMagic,
  onPickSuggestion,
}: ChatViewProps) {
  const busy = Boolean(thinking || streaming);

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

      <div className="px-3 pt-2 pb-4 sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
          <ChatInput
            onSend={onSend}
            onStop={onStop}
            onMagic={onMagic}
            disabled={busy}
            userId={userId}
          />
        </div>
      </div>
    </div>
  );
}
