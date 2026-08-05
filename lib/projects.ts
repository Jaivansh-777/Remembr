export type ProjectMemoryType = "fact" | "preference" | "decision" | "project_update";

export interface ProjectDoc {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  members: string[];
  inviteCodes: string[];
  createdAt: number;
  updatedAt: number;
  chatIds: string[];
  memoryCount: number;
}

export interface ProjectMember {
  uid: string;
  name: string;
  email?: string | null;
  photoURL?: string | null;
  role: "owner" | "member";
}

export interface ProjectMemoryItem {
  id: string;
  userId: string;
  userName: string;
  content: string;
  type: ProjectMemoryType;
  timestamp: number;
  confidence: number;
  chatId?: string;
  tags?: string[];
  shared: boolean;
}

export const PROJECT_MEMORY_LABEL: Record<ProjectMemoryType, string> = {
  fact: "Fact",
  preference: "Preference",
  decision: "Decision",
  project_update: "Project update",
};

const INVITE_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function generateInviteCode(length = 8): string {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let code = "";
  for (let i = 0; i < length; i++) {
    code += INVITE_ALPHABET[bytes[i] % INVITE_ALPHABET.length];
  }
  return code;
}

export function getInviteUrl(inviteCode: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/invite/${inviteCode}`;
  }
  return `https://remembr.sbs/invite/${inviteCode}`;
}

export function getProjectUrl(projectId: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/projects/${projectId}`;
  }
  return `https://remembr.sbs/projects/${projectId}`;
}

export function toProjectDoc(id: string, data: Record<string, unknown>): ProjectDoc {
  return {
    id,
    name: String(data.name ?? "Untitled project"),
    description: String(data.description ?? ""),
    ownerId: String(data.ownerId ?? ""),
    members: Array.isArray(data.members) ? (data.members as string[]) : [],
    inviteCodes: Array.isArray(data.inviteCodes)
      ? (data.inviteCodes as string[])
      : [],
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
    chatIds: Array.isArray(data.chatIds) ? (data.chatIds as string[]) : [],
    memoryCount: Number(data.memoryCount ?? 0),
  };
}

function toMillis(value: unknown): number {
  if (value && typeof value === "object" && "toMillis" in value) {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (typeof value === "number") return value;
  return 0;
}
