"use client";

import { ArrowLeft } from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { FileManager } from "@/components/files/FileManager";

function FilesContent() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="flex items-center gap-3">
        <a
          href="/chat"
          className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#A1A1A1] transition-colors hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="size-4" />
        </a>
        <div className="flex flex-col">
          <h1 className="text-xl font-semibold tracking-tight text-white">
            Files
          </h1>
          <p className="text-sm text-[#A1A1A1]">
            Everything you have uploaded, extracted, and summarized
          </p>
        </div>
      </div>

      <FileManager />
    </main>
  );
}

export default function FilesPage() {
  return (
    <ProtectedRoute>
      <FilesContent />
    </ProtectedRoute>
  );
}
