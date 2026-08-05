"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ChatLayout } from "@/components/chat/ChatLayout";

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <ChatLayout />
    </ProtectedRoute>
  );
}
