"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";

import type { ChatDoc } from "@/lib/chat";
import { cn } from "@/lib/utils";

interface SidebarProps {
  chats: ChatDoc[];
  activeChatId: string | null;
  open: boolean;
  onClose: () => void;
  onSelect: (chatId: string) => void;
  onNewChat: () => void;
  onDelete: (chat: ChatDoc) => void;
  onRename: (chatId: string, title: string) => void;
}

function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function Sidebar({
  chats,
  activeChatId,
  open,
  onClose,
  onSelect,
  onNewChat,
  onDelete,
  onRename,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const handleClose = () => {
    setEditingId(null);
    onClose();
  };

  const startRename = (chat: ChatDoc) => {
    setEditingId(chat.id);
    setDraft(chat.title);
  };

  const commitRename = () => {
    if (editingId && draft.trim()) {
      onRename(editingId, draft.trim());
    }
    setEditingId(null);
  };

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={handleClose}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/10 bg-[#0F0F0F]/90 backdrop-blur-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:static md:z-auto md:shrink-0 md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <button
            type="button"
            onClick={onNewChat}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] px-3 py-2.5 text-sm font-medium text-white shadow-[0_0_20px_rgba(124,58,237,0.35)] transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" />
            New Chat
          </button>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close sidebar"
            className="ml-2 flex size-8 cursor-pointer items-center justify-center rounded-lg text-[#A1A1A1] hover:bg-white/5 hover:text-white md:hidden"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="chat-scrollbar flex-1 overflow-y-auto p-2">
          {chats.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-[#A1A1A1]">
              No conversations yet.
              <br />
              Start one below.
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {chats.map((chat) => {
                const active = chat.id === activeChatId;
                return (
                  <div
                    key={chat.id}
                    className={cn(
                      "group relative flex flex-col rounded-xl border border-transparent px-3 py-2.5 transition-colors",
                      active
                        ? "border-[#7C3AED]/40 bg-[#7C3AED]/10"
                        : "hover:bg-white/5"
                    )}
                  >
                    {editingId === chat.id ? (
                      <input
                        autoFocus
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") commitRename();
                          if (event.key === "Escape") setEditingId(null);
                        }}
                        className="w-full rounded-md border border-[#7C3AED]/50 bg-[#1A1A1A] px-2 py-1 text-sm text-white focus:outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(chat.id);
                          handleClose();
                        }}
                        onDoubleClick={() => startRename(chat)}
                        className="cursor-pointer text-left"
                      >
                        <p className="truncate text-sm font-medium text-white">
                          {chat.title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-[#A1A1A1]">
                          {chat.lastMessage || "Empty conversation"}
                        </p>
                        <p className="mt-0.5 text-[10px] text-[#6B6B6B]">
                          {relativeTime(chat.updatedAt)}
                        </p>
                      </button>
                    )}

                    {editingId !== chat.id ? (
                      <div className="absolute top-2 right-2 hidden gap-0.5 group-hover:flex">
                        <button
                          type="button"
                          aria-label="Rename chat"
                          onClick={() => startRename(chat)}
                          className="flex size-7 cursor-pointer items-center justify-center rounded-md bg-[#1A1A1A] text-[#A1A1A1] hover:text-white"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Delete chat"
                          onClick={() => onDelete(chat)}
                          className="flex size-7 cursor-pointer items-center justify-center rounded-md bg-[#1A1A1A] text-red-400 hover:bg-red-500/15 hover:text-red-300"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
