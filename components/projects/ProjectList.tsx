"use client";

import { Folder, Plus, Users } from "lucide-react";

import type { ProjectDoc } from "@/lib/projects";
import { cn } from "@/lib/utils";

interface ProjectListProps {
  projects: ProjectDoc[];
  activeProjectId: string | null;
  onSelect: (projectId: string) => void;
  onCreateProject: () => void;
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

export function ProjectList({
  projects,
  activeProjectId,
  onSelect,
  onCreateProject,
}: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <button
        type="button"
        onClick={onCreateProject}
        className="flex w-full cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/15 px-3 py-2.5 text-sm text-[#A1A1A1] transition-colors hover:border-white/30 hover:bg-white/5 hover:text-white"
      >
        <Plus className="size-4" />
        Create a project to share memory with your team
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-3 pb-1">
        <p className="text-[10px] font-semibold tracking-wider text-[#6B6B6B] uppercase">
          My Projects
        </p>
        <button
          type="button"
          aria-label="Create project"
          onClick={onCreateProject}
          className="flex size-6 cursor-pointer items-center justify-center rounded-md text-[#A1A1A1] transition-colors hover:bg-white/5 hover:text-white"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
      {projects.map((project) => {
        const active = project.id === activeProjectId;
        return (
          <button
            key={project.id}
            type="button"
            onClick={() => onSelect(project.id)}
            className={cn(
              "flex w-full cursor-pointer items-center gap-2 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors",
              active
                ? "border-white/20 bg-white/10"
                : "hover:bg-white/5"
            )}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10">
              <Folder className="size-3.5 text-white" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-white">
                {project.name}
              </span>
              <span className="block text-[10px] text-[#6B6B6B]">
                {relativeTime(project.updatedAt)}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1 text-[11px] text-[#A1A1A1]">
              <Users className="size-3" />
              {project.members.length}
            </span>
          </button>
        );
      })}
    </div>
  );
}
