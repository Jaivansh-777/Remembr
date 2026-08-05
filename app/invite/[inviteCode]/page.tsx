"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Folder, Loader2, Sparkles } from "lucide-react";

import GoogleSignIn from "@/components/GoogleSignIn";
import { useAuth } from "@/lib/auth-context";

type JoinState = "checking" | "success" | "error";

export default function InvitePage() {
  const params = useParams<{ inviteCode: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [state, setState] = useState<JoinState>("checking");
  const [error, setError] = useState("");
  const [projectName, setProjectName] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) return;

    let cancelled = false;
    user
      .getIdToken()
      .then((token) =>
        fetch(`/api/projects/join/${encodeURIComponent(params.inviteCode)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })
      )
      .then((response) =>
        response.json() as Promise<{
          project?: { id: string; name?: string };
          error?: string;
        }>
      )
      .then((data) => {
        if (cancelled) return;
        if (!data.project) {
          setError(String(data.error ?? "This invite link is invalid."));
          setState("error");
          return;
        }
        setProjectName(data.project.name ?? null);
        setState("success");
        router.replace(`/projects/${data.project.id}`);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Something went wrong joining the project. Please try again.");
        setState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [loading, user, params.inviteCode, router]);

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="animate-drop-in flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-white/10 bg-[#141414]/90 p-8 text-center shadow-[0_16px_64px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
        <span className="flex size-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl">
          {state === "checking" ? (
            <Loader2 className="size-6 animate-spin text-white" />
          ) : (
            <Folder className="size-6 text-white" />
          )}
        </span>

        {state === "success" ? (
          <>
            <h1 className="text-lg font-semibold text-white">Welcome aboard!</h1>
            <p className="text-sm text-[#A1A1A1]">
              {projectName
                ? `You've joined &quot;${projectName}&quot;. Redirecting to your project…`
                : "You've joined the project. Redirecting…"}
            </p>
          </>
        ) : state === "error" ? (
          <>
            <h1 className="text-lg font-semibold text-white">
              Couldn&apos;t join the project
            </h1>
            <p className="text-sm text-[#A1A1A1]">{error}</p>
            <div className="mt-2 flex flex-col gap-2">
              {!user ? <GoogleSignIn label="Sign in to join" /> : null}
              <Link
                href="/chat"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                Go to Remembr
              </Link>
            </div>
          </>
        ) : !user && !loading ? (
          <>
            <h1 className="text-lg font-semibold text-white">
              Join this project on Remembr
            </h1>
            <p className="text-sm text-[#A1A1A1]">
              Sign in to join your team and share memory context together.
            </p>
            <GoogleSignIn label="Sign in to join" />
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-white">
              Joining project…
            </h1>
            <p className="text-sm text-[#A1A1A1]">
              One moment while we get you set up.
            </p>
          </>
        )}

        <p className="flex items-center gap-1.5 text-xs text-[#6B6B6B]">
          <Sparkles className="size-3" />
          Remembr — memory-first AI for teams
        </p>
      </div>
    </main>
  );
}
