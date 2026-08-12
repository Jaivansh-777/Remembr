"use client";

import { useEffect, useState } from "react";
import { BrainCircuit, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth-context";
import {
  clearMemories,
  deleteMemory,
  watchMemories,
  type MemoryItem,
} from "@/lib/firebase/firestore";

const MEMORY_TYPE_LABEL: Record<MemoryItem["type"], string> = {
  fact: "Fact",
  preference: "Preference",
  tone: "Tone",
  project: "Project",
  attachment: "Attachment",
};

function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function MemoryDashboard() {
  const { user } = useAuth();
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = watchMemories(user.uid, setMemories);
    return unsub;
  }, [user]);

  const handleDelete = async (memoryId: string) => {
    if (!user) return;
    try {
      await deleteMemory(user.uid, memoryId);
      toast.success("Memory deleted");
    } catch (error) {
      console.error("[memory-dashboard] delete failed:", error);
      toast.error("Failed to delete memory");
    }
  };

  const handleClearAll = async () => {
    if (!user || memories.length === 0) return;
    if (!window.confirm(`Delete all ${memories.length} memories? This cannot be undone.`)) {
      return;
    }
    setClearing(true);
    try {
      await clearMemories(user.uid);
      toast.success("All memories cleared");
    } catch (error) {
      console.error("[memory-dashboard] clear failed:", error);
      toast.error("Failed to clear memories");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-[#A1A1A1]">
          <BrainCircuit className="size-4" />
          <span>
            {memories.length} stored memory
            {memories.length === 1 ? "" : "ies"}
          </span>
        </div>
        {memories.length > 0 ? (
          <button
            type="button"
            onClick={() => void handleClearAll()}
            disabled={clearing}
            className="flex cursor-pointer items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-50"
          >
            {clearing ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Trash2 className="size-3" />
            )}
            Clear all
          </button>
        ) : null}
      </div>

      {memories.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 py-10 text-center">
          <BrainCircuit className="size-6 text-[#A1A1A1]" />
          <p className="text-sm text-[#A1A1A1]">
            No memories yet. Chat with Remembr in Soulmate mode to
            start building your memory.
          </p>
        </div>
      ) : (
        <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto pr-1">
          {memories.map((memory) => (
            <div
              key={memory.id}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="leading-relaxed text-white">{memory.content}</p>
                <div className="mt-1.5 flex items-center gap-2 text-[11px] text-[#A1A1A1]">
                  <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/90">
                    {MEMORY_TYPE_LABEL[memory.type]}
                  </span>
                  <span>{relativeTime(memory.timestamp)}</span>
                </div>
              </div>
              <button
                type="button"
                aria-label="Delete memory"
                onClick={() => void handleDelete(memory.id)}
                className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#A1A1A1] transition-colors hover:bg-red-500/10 hover:text-red-300"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
