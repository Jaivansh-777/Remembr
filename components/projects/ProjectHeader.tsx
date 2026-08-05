"use client";

import { BarChart3, Folder, UserPlus, Users } from "lucide-react";
import Link from "next/link";

import type { ProjectDoc } from "@/lib/projects";

interface ProjectHeaderProps {
  project: ProjectDoc;
  onInvite: () => void;
}

export function ProjectHeader({ project, onInvite }: ProjectHeaderProps) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10 backdrop-blur-xl">
        <Folder className="size-4 text-white" />
      </span>
      <div className="flex min-w-0 flex-col">
        <p className="truncate text-[15px] font-semibold tracking-tight text-white">
          {project.name}
        </p>
        <p className="flex items-center gap-1 text-[11px] text-[#A1A1A1]">
          <Users className="size-3" />
          {project.members.length} member{project.members.length === 1 ? "" : "s"}
        </p>
      </div>
      <span className="ml-1 hidden shrink-0 gap-1 sm:flex">
        <button
          type="button"
          aria-label="Invite team members"
          onClick={onInvite}
          className="flex size-8 cursor-pointer items-center justify-center rounded-xl text-[#A1A1A1] transition-colors hover:bg-white/5 hover:text-white"
        >
          <UserPlus className="size-4" />
        </button>
        <Link
          href={`/projects/${project.id}/memories`}
          aria-label="Project memory dashboard"
          className="flex size-8 items-center justify-center rounded-xl text-[#A1A1A1] transition-colors hover:bg-white/5 hover:text-white"
        >
          <BarChart3 className="size-4" />
        </Link>
      </span>
    </div>
  );
}
