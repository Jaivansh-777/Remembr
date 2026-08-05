"use client";

import { useParams } from "next/navigation";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ChatLayout } from "@/components/chat/ChatLayout";

export default function ProjectChatPage() {
  const params = useParams<{ projectId: string }>();
  return (
    <ProtectedRoute>
      <ChatLayout projectId={params.projectId} />
    </ProtectedRoute>
  );
}
