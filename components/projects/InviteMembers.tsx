"use client";

import { useEffect, useState } from "react";
import {
  Copy,
  Loader2,
  Mail,
  Send,
  Shield,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth-context";
import {
  addProjectInviteCode,
  getProjectMembers,
  removeProjectMember,
} from "@/lib/firebase/firestore";
import { getInviteUrl, type ProjectDoc, type ProjectMember } from "@/lib/projects";

interface InviteMembersProps {
  project: ProjectDoc;
  onClose: () => void;
}

export function InviteMembers({ project, onClose }: InviteMembersProps) {
  const { user } = useAuth();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState(
    project.inviteCodes[0] ?? ""
  );

  const isOwner = user?.uid === project.ownerId;

  useEffect(() => {
    let active = true;
    void getProjectMembers(project)
      .then((list) => {
        if (active) setMembers(list);
      })
      .catch(() => {
        if (active) setMembers([]);
      });
    return () => {
      active = false;
    };
  }, [project]);

  const copyInviteLink = async () => {
    if (!inviteCode) {
      try {
        const code = await addProjectInviteCode(project.id);
        setInviteCode(code);
        await navigator.clipboard.writeText(getInviteUrl(code));
        toast.success("Invite link copied to clipboard");
      } catch {
        toast.error("Could not generate an invite link");
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(getInviteUrl(inviteCode));
      toast.success("Invite link copied to clipboard");
    } catch {
      toast.error("Could not copy the invite link");
    }
  };

  const handleInvite = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Enter a valid email address");
      return;
    }
    if (!user) return;
    setInviting(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/projects/${project.id}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = (await response.json()) as {
        inviteUrl?: string;
        emailSent?: boolean;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(String(data.error ?? "Invite failed"));
      }
      setEmail("");
      if (data.inviteUrl) {
        setInviteCode(data.inviteUrl.split("/").pop() ?? "");
      }
      toast.success(
        data.emailSent
          ? `Invite sent to ${trimmed}`
          : `Invite link ready — share it with ${trimmed}`
      );
    } catch (error) {
      console.error("[invite-members] failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to invite member");
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (uid: string) => {
    if (!user || user.uid === uid) return;
    if (!window.confirm("Remove this member from the project?")) return;
    setRemoving(uid);
    try {
      await removeProjectMember(project.id, uid);
      setMembers((prev) => prev.filter((m) => m.uid !== uid));
      toast.success("Member removed");
    } catch (error) {
      console.error("[invite-members] remove failed:", error);
      toast.error("Failed to remove member");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-drop-in flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl border border-white/10 bg-[#141414]/90 p-6 shadow-[0_16px_64px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl border border-white/15 bg-white/10">
              <UserPlus className="size-4 text-white" />
            </span>
            <h2 className="text-base font-semibold text-white">
              Invite Team Members
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

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
          <div>
            <p className="mb-2 text-xs font-medium text-[#A1A1A1]">
              Current Members ({members.length})
            </p>
            <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
              {members.map((member) => (
                <div
                  key={member.uid}
                  className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                >
                  {member.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.photoURL}
                      alt={member.name}
                      className="size-7 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex size-7 items-center justify-center rounded-full border border-white/10 bg-white/10 text-xs font-medium text-white">
                      {member.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {member.name}
                      {member.uid === user?.uid ? " (You)" : ""}
                    </p>
                    {member.email ? (
                      <p className="truncate text-[11px] text-[#A1A1A1]">
                        {member.email}
                      </p>
                    ) : null}
                  </div>
                  {member.role === "owner" ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white">
                      <Shield className="size-2.5" />
                      Owner
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-[#A1A1A1]">
                      Member
                    </span>
                  )}
                  {isOwner && member.role !== "owner" ? (
                    <button
                      type="button"
                      aria-label={`Remove ${member.name}`}
                      onClick={() => void handleRemove(member.uid)}
                      disabled={removing === member.uid}
                      className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#A1A1A1] transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                    >
                      {removing === member.uid ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-[#A1A1A1]">
              Invite by Email
            </p>
            <div className="flex gap-2">
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleInvite();
                }}
                placeholder="teammate@example.com"
                className="h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-[#1A1A1A] px-3 text-sm text-white outline-none transition-colors placeholder:text-[#6B6B6B] focus:border-white/40"
              />
              <button
                type="button"
                onClick={() => void handleInvite()}
                disabled={inviting}
                className="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-white px-4 text-sm font-medium text-[#0A0A0A] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {inviting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Invite
              </button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-[#A1A1A1]">
              Or share invite link
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#1A1A1A] px-3 py-2.5">
              <Mail className="size-4 shrink-0 text-[#A1A1A1]" />
              <span className="min-w-0 flex-1 truncate text-xs text-[#A1A1A1]">
                {inviteCode ? getInviteUrl(inviteCode) : "Generate a link…"}
              </span>
              <button
                type="button"
                onClick={() => void copyInviteLink()}
                className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#A1A1A1] transition-colors hover:bg-white/5 hover:text-white"
              >
                <Copy className="size-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-10 cursor-pointer rounded-xl px-5 text-sm font-medium text-[#A1A1A1] transition-colors hover:bg-white/5 hover:text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
