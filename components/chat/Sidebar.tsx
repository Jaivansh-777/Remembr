"use client";

import { useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import type { ChatDoc } from "@/lib/chat";
import { cn } from "@/lib/utils";

interface SidebarProps {
  chats: ChatDoc[];
  activeChatId: string | null;
  open: boolean;
  minimized: boolean;
  onClose: () => void;
  onToggleMinimize: () => void;
  onSelect: (chatId: string) => void;
  onNewChat: () => void;
  onDelete: (chat: ChatDoc) => void;
  onRename: (chatId: string, title: string) => void;
  onArchive: (chat: ChatDoc) => void;
  onRestore: (chat: ChatDoc) => void;
}

interface ChatGroup {
  label: string;
  chats: ChatDoc[];
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

function startOfToday(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function groupChats(chats: ChatDoc[]): ChatGroup[] {
  const today = startOfToday();
  const day = 86_400_000;
  const buckets: ChatGroup[] = [
    { label: "Today", chats: [] },
    { label: "Yesterday", chats: [] },
    { label: "Previous 7 days", chats: [] },
    { label: "Previous 30 days", chats: [] },
    { label: "Older", chats: [] },
  ];
  for (const chat of chats) {
    const ts = chat.updatedAt;
    if (ts >= today) buckets[0].chats.push(chat);
    else if (ts >= today - day) buckets[1].chats.push(chat);
    else if (ts >= today - 7 * day) buckets[2].chats.push(chat);
    else if (ts >= today - 30 * day) buckets[3].chats.push(chat);
    else buckets[4].chats.push(chat);
  }
  return buckets.filter((group) => group.chats.length > 0);
}

interface ChatRowProps {
  chat: ChatDoc;
  active: boolean;
  archived?: boolean;
  onSelect: () => void;
  onRename: (chat: ChatDoc) => void;
  onArchive: (chat: ChatDoc) => void;
  onRestore: (chat: ChatDoc) => void;
  onDelete: (chat: ChatDoc) => void;
}

function ChatRow({
  chat,
  active,
  archived,
  onSelect,
  onRename,
  onArchive,
  onRestore,
  onDelete,
}: ChatRowProps) {
  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border border-transparent px-3 py-2.5 transition-colors",
        active ? "border-white/20 bg-white/10" : "hover:bg-white/5"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        onDoubleClick={() => onRename(chat)}
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

      <div className="absolute top-2 right-2 hidden gap-0.5 group-hover:flex">
        {!archived ? (
          <>
            <button
              type="button"
              aria-label="Rename chat"
              onClick={() => onRename(chat)}
              className="flex size-7 cursor-pointer items-center justify-center rounded-md bg-[#1A1A1A] text-[#A1A1A1] hover:text-white"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="Archive chat"
              onClick={() => onArchive(chat)}
              className="flex size-7 cursor-pointer items-center justify-center rounded-md bg-[#1A1A1A] text-[#A1A1A1] hover:text-white"
            >
              <Archive className="size-3.5" />
            </button>
          </>
        ) : (
          <button
            type="button"
            aria-label="Restore chat"
            onClick={() => onRestore(chat)}
            className="flex size-7 cursor-pointer items-center justify-center rounded-md bg-[#1A1A1A] text-[#A1A1A1] hover:text-white"
          >
            <ArchiveRestore className="size-3.5" />
          </button>
        )}
        <button
          type="button"
          aria-label="Delete chat"
          onClick={() => onDelete(chat)}
          className="flex size-7 cursor-pointer items-center justify-center rounded-md bg-[#1A1A1A] text-red-400 hover:bg-red-500/15 hover:text-red-300"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

export function Sidebar({
  chats,
  activeChatId,
  open,
  minimized,
  onClose,
  onToggleMinimize,
  onSelect,
  onNewChat,
  onDelete,
  onRename,
  onArchive,
  onRestore,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [archivedOpen, setArchivedOpen] = useState(false);

  const activeChats = chats.filter((chat) => !chat.archived);
  const archivedChats = chats.filter((chat) => chat.archived);
  const groups = groupChats(activeChats);

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

  const select = (id: string) => {
    onSelect(id);
    handleClose();
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
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/10 bg-[#0F0F0F]/90 backdrop-blur-2xl transition-[transform,width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:static md:z-auto md:shrink-0 md:translate-x-0",
          minimized && "md:w-0 md:overflow-hidden md:border-r-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <button
            type="button"
            onClick={onNewChat}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-medium text-[#0A0A0A] shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" />
            New Chat
          </button>
          <button
            type="button"
            onClick={onToggleMinimize}
            aria-label="Minimize sidebar"
            className="ml-2 hidden size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#A1A1A1] hover:bg-white/5 hover:text-white md:flex"
          >
            <PanelLeftClose className="size-4" />
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
          {groups.length === 0 && archivedChats.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-[#A1A1A1]">
              No conversations yet.
              <br />
              Start one below.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {groups.map((group) => (
                <div key={group.label}>
                  <p className="px-3 pt-1 pb-1 text-[10px] font-semibold tracking-wider text-[#6B6B6B] uppercase">
                    {group.label}
                  </p>
                  <div className="flex flex-col gap-1">
                    {group.chats.map((chat) =>
                      editingId === chat.id ? (
                        <div key={chat.id} className="px-1">
                          <input
                            autoFocus
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            onBlur={commitRename}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") commitRename();
                              if (event.key === "Escape") setEditingId(null);
                            }}
                            className="w-full rounded-md border border-white/30 bg-[#1A1A1A] px-2 py-1 text-sm text-white focus:outline-none"
                          />
                        </div>
                      ) : (
                        <ChatRow
                          key={chat.id}
                          chat={chat}
                          active={chat.id === activeChatId}
                          onSelect={() => select(chat.id)}
                          onRename={startRename}
                          onArchive={onArchive}
                          onRestore={onRestore}
                          onDelete={onDelete}
                        />
                      )
                    )}
                  </div>
                </div>
              ))}

              {archivedChats.length > 0 ? (
                <div>
                  <button
                    type="button"
                    onClick={() => setArchivedOpen((prev) => !prev)}
                    className="flex w-full cursor-pointer items-center gap-1.5 px-3 py-1 text-[10px] font-semibold tracking-wider text-[#6B6B6B] uppercase hover:text-[#A1A1A1]"
                  >
                    {archivedOpen ? (
                      <ChevronDown className="size-3" />
                    ) : (
                      <ChevronRight className="size-3" />
                    )}
                    Archived
                    <span className="rounded-full bg-white/10 px-1.5 text-[10px] text-[#A1A1A1]">
                      {archivedChats.length}
                    </span>
                  </button>
                  {archivedOpen ? (
                    <div className="flex flex-col gap-1 pt-1">
                      {archivedChats.map((chat) => (
                        <ChatRow
                          key={chat.id}
                          chat={chat}
                          archived
                          active={chat.id === activeChatId}
                          onSelect={() => select(chat.id)}
                          onRename={startRename}
                          onArchive={onArchive}
                          onRestore={onRestore}
                          onDelete={onDelete}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
