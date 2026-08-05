"use client";

import { useEffect, useMemo, useState } from "react";
import { BrainCircuit, Folder, Search } from "lucide-react";

import { watchProjectMemories } from "@/lib/firebase/firestore";
import {
  PROJECT_MEMORY_LABEL,
  type ProjectDoc,
  type ProjectMemoryItem,
  type ProjectMemoryType,
} from "@/lib/projects";
import { cn } from "@/lib/utils";

interface ProjectMemoryDashboardProps {
  project: ProjectDoc;
}

type Filter = "all" | ProjectMemoryType;
type Sort = "date" | "confidence" | "user";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "fact", label: "Facts" },
  { id: "decision", label: "Decisions" },
  { id: "preference", label: "Preferences" },
  { id: "project_update", label: "Updates" },
];

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

export function ProjectMemoryDashboard({ project }: ProjectMemoryDashboardProps) {
  const [memories, setMemories] = useState<ProjectMemoryItem[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("date");

  useEffect(() => {
    const unsub = watchProjectMemories(project.id, setMemories);
    return unsub;
  }, [project.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = memories.filter((memory) => {
      if (filter !== "all" && memory.type !== filter) return false;
      if (q && !memory.content.toLowerCase().includes(q)) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      if (sort === "confidence") return b.confidence - a.confidence;
      if (sort === "user") return a.userName.localeCompare(b.userName);
      return b.timestamp - a.timestamp;
    });
  }, [memories, filter, search, sort]);

  const contributorStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const memory of memories) {
      counts.set(memory.userName, (counts.get(memory.userName) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [memories]);

  const topTopic = useMemo(() => {
    const counts = new Map<string, number>();
    for (const memory of memories) {
      const words = memory.content
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 3);
      for (const word of words) {
        counts.set(word, (counts.get(word) ?? 0) + 1);
      }
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return top ? { word: top[0], count: top[1] } : null;
  }, [memories]);

  const mostActive = contributorStats[0];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-8">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 backdrop-blur-xl">
            <Folder className="size-4 text-white" />
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white">
              Project Memory Dashboard
            </h1>
            <p className="text-xs text-[#A1A1A1]">
              {project.name} — {memories.length} shared memor
              {memories.length === 1 ? "y" : "ies"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-xl border border-white/10 bg-[#1A1A1A]/60 p-1">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={cn(
                "cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                filter === item.id
                  ? "bg-white text-[#0A0A0A]"
                  : "text-[#A1A1A1] hover:text-white"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-[#1A1A1A]/60 px-3 py-2">
          <Search className="size-4 shrink-0 text-[#A1A1A1]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search memories…"
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[#6B6B6B]"
          />
        </div>
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as Sort)}
          className="h-10 cursor-pointer rounded-xl border border-white/10 bg-[#1A1A1A]/60 px-3 text-xs font-medium text-[#A1A1A1] outline-none focus:border-white/30"
        >
          <option value="date">Sort: Date</option>
          <option value="confidence">Sort: Confidence</option>
          <option value="user">Sort: User</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 py-14 text-center">
          <BrainCircuit className="size-6 text-[#A1A1A1]" />
          <p className="text-sm text-[#A1A1A1]">
            No shared memories here yet. Chat in a project and ask Remembr to
            remember something — the whole team will see it.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((memory) => (
            <div
              key={memory.id}
              className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-xs font-medium text-white">
                {memory.userName.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="leading-relaxed text-sm text-white">
                  {memory.content}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[#A1A1A1]">
                  <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white">
                    {PROJECT_MEMORY_LABEL[memory.type]}
                  </span>
                  <span>
                    {memory.userName} · {relativeTime(memory.timestamp)}
                  </span>
                  <span className="rounded-full bg-white/5 px-2 py-0.5">
                    {Math.round(memory.confidence * 100)}% confidence
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {memories.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="mb-3 text-xs font-semibold tracking-wider text-[#A1A1A1] uppercase">
              Team Insights
            </p>
            <div className="flex flex-col gap-2 text-sm text-white">
              {mostActive ? (
                <p>
                  <span className="text-[#A1A1A1]">Most active: </span>
                  {mostActive[0]} ({mostActive[1]} memory
                  {mostActive[1] === 1 ? "" : "ies"})
                </p>
              ) : null}
              {topTopic ? (
                <p>
                  <span className="text-[#A1A1A1]">Top topic: </span>
                  {topTopic.word} ({topTopic.count} mention
                  {topTopic.count === 1 ? "" : "s"})
                </p>
              ) : null}
              <p>
                <span className="text-[#A1A1A1]">Shared context: </span>
                {memories.length} memories powering every team conversation
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="mb-3 text-xs font-semibold tracking-wider text-[#A1A1A1] uppercase">
              Contributors
            </p>
            <div className="flex flex-col gap-2 text-sm text-white">
              {contributorStats.map(([name, count]) => (
                <div
                  key={name}
                  className="flex items-center justify-between gap-2"
                >
                  <span>{name}</span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-[#A1A1A1]">
                    {count} memory{count === 1 ? "" : "ies"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
