"use client";

import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth-context";
import { createProject } from "@/lib/firebase/firestore";
import type { ProjectDoc } from "@/lib/projects";

interface CreateProjectProps {
  open: boolean;
  onClose: () => void;
  onCreated: (project: ProjectDoc) => void;
}

export function CreateProject({ open, onClose, onCreated }: CreateProjectProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!user) {
      toast.error("Please sign in first");
      return;
    }
    if (!trimmed) {
      toast.error("Project name is required");
      return;
    }
    setPending(true);
    try {
      const project = await createProject(user.uid, trimmed, description.trim());
      toast.success(`Created "${trimmed}"`);
      setName("");
      setDescription("");
      onCreated(project);
    } catch (error) {
      console.error("[create-project] failed:", error);
      toast.error("Failed to create project");
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-drop-in w-full max-w-md rounded-2xl border border-white/10 bg-[#141414]/90 p-6 shadow-[0_16px_64px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl border border-white/15 bg-white/10">
              <Plus className="size-4 text-white" />
            </span>
            <h2 className="text-base font-semibold text-white">
              Create New Project
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-[#A1A1A1] transition-colors hover:bg-white/5 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[#A1A1A1]">
              Project Name <span className="text-white">*</span>
            </span>
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleSubmit();
              }}
              placeholder="e.g. Project Phoenix"
              className="h-10 rounded-xl border border-white/10 bg-[#1A1A1A] px-3 text-sm text-white outline-none transition-colors placeholder:text-[#6B6B6B] focus:border-white/40"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[#A1A1A1]">
              Description (optional)
            </span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="What is this project about?"
              className="resize-none rounded-xl border border-white/10 bg-[#1A1A1A] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-[#6B6B6B] focus:border-white/40"
            />
          </label>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 cursor-pointer rounded-xl px-4 text-sm font-medium text-[#A1A1A1] transition-colors hover:bg-white/5 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={pending || !name.trim()}
            className="flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-white px-4 text-sm font-medium text-[#0A0A0A] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Create Project
          </button>
        </div>
      </div>
    </div>
  );
}
