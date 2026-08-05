"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ProjectMemoryDashboard } from "@/components/projects/ProjectMemoryDashboard";
import { getProject } from "@/lib/firebase/firestore";
import type { ProjectDoc } from "@/lib/projects";

function ProjectMemoriesPage() {
  const params = useParams<{ projectId: string }>();
  const [project, setProject] = useState<ProjectDoc | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    void getProject(params.projectId)
      .then((doc) => {
        if (!active) return;
        if (doc) {
          setProject(doc);
          setState("ready");
        } else {
          setState("error");
        }
      })
      .catch(() => {
        if (active) setState("error");
      });
    return () => {
      active = false;
    };
  }, [params.projectId]);

  if (state === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center text-white">
        <Loader2 className="size-6 animate-spin text-[#A1A1A1]" />
      </div>
    );
  }

  if (state === "error" || !project) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-[#A1A1A1]">
          You don&apos;t have access to this project, or it doesn&apos;t exist.
        </p>
        <Link
          href="/chat"
          className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-[#0A0A0A]"
        >
          Back to chat
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="border-b border-white/10 bg-[#0A0A0A]/70 backdrop-blur-2xl">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center gap-3 px-4">
          <Link
            href={`/projects/${project.id}`}
            className="flex size-9 items-center justify-center rounded-xl text-[#A1A1A1] transition-colors hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <p className="text-sm font-medium text-white">
            {project.name}
          </p>
        </div>
      </div>
      <ProjectMemoryDashboard project={project} />
    </div>
  );
}

export default function ProjectMemoriesPageRoute() {
  return (
    <ProtectedRoute>
      <ProjectMemoriesPage />
    </ProtectedRoute>
  );
}
