"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { User as UserIcon } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BlockedDeviceModal } from "@/components/upgrade/BlockedDeviceModal";
import { generateFingerprint } from "@/lib/fingerprint";
import {
  auth,
  getRedirectResult,
  googleProvider,
  signInAnonymously,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import type { TrialBlockReason } from "@/lib/trial-protection";

interface GoogleSignInProps {
  className?: string;
  label?: string;
  /** Set true on flows that must never block (e.g. project invite joins). */
  skipTrialCheck?: boolean;
}

function GoogleLogo() {
  return (
    <svg className="size-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
      />
    </svg>
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/popup-blocked":
        return "Please allow popups for this site";
      case "auth/unauthorized-domain":
        return "Please add this domain to Firebase Console";
      case "auth/network-request-failed":
        return "Network error, please try again";
      case "auth/operation-not-allowed":
        return "Guest access is not enabled. Enable Anonymous sign-in in Firebase Console.";
      case "auth/too-many-requests":
        return "Too many attempts. Please try again later.";
    }
  }
  return "Something went wrong. Please try again.";
}

export default function GoogleSignIn({
  className,
  label = "Sign in with Google",
  skipTrialCheck = false,
}: GoogleSignInProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [blocked, setBlocked] = useState<TrialBlockReason | null>(null);
  const [guestSetupHelp, setGuestSetupHelp] = useState(false);

  /**
   * Runs the free-trial guard after sign-in. Returns `false` (blocking the
   * redirect to /chat) when this device/IP has already used the free trial.
   * Fails open so a transient error never locks out a legitimate user.
   */
  const runTrialGuard = useCallback(
    async (currentUser: { getIdToken: () => Promise<string> }): Promise<boolean> => {
      if (skipTrialCheck) return true;
      try {
        const fingerprint = await generateFingerprint();
        const token = await currentUser.getIdToken();
        const response = await fetch("/api/auth/check-trial", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fingerprint }),
        });
        const data = (await response.json()) as {
          eligible?: boolean;
          reason?: TrialBlockReason;
        };
        if (!response.ok) {
          console.warn("[signin] trial check failed:", data);
          return true;
        }
        if (data.eligible === false) {
          setBlocked(data.reason === "ip_limit" ? "ip_limit" : "device_used");
          return false;
        }
        return true;
      } catch (error) {
        console.warn("[signin] trial check error:", error);
        return true;
      }
    },
    [skipTrialCheck]
  );

  useEffect(() => {
    if (!auth) return;
    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          const allowed = await runTrialGuard(result.user);
          if (allowed) {
            router.replace("/chat");
          }
        }
      })
      .catch((error: unknown) => {
        toast.error(getErrorMessage(error));
      });
  }, [router, runTrialGuard]);

  const handleSignIn = async () => {
    if (!auth) {
      toast.error("Firebase is not configured. Check environment variables.");
      return;
    }
    setPending(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        const allowed = await runTrialGuard(result.user);
        if (allowed) {
          router.push("/chat");
        }
      }
    } catch (error) {
      if (
        error instanceof FirebaseError &&
        error.code === "auth/popup-blocked"
      ) {
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectError) {
          toast.error(getErrorMessage(redirectError));
        }
      } else {
        toast.error(getErrorMessage(error));
      }
    } finally {
      setPending(false);
    }
  };

  const handleGuestSignIn = async () => {
    if (!auth) {
      toast.error("Firebase is not configured. Check environment variables.");
      return;
    }
    setPending(true);
    setGuestSetupHelp(false);
    try {
      const result = await signInAnonymously(auth);
      if (result.user) {
        const allowed = await runTrialGuard(result.user);
        if (allowed) {
          router.push("/chat");
        } else {
          // Trial already used on this device/IP — undo the throwaway account.
          await signOut(auth).catch(() => undefined);
        }
      }
    } catch (error) {
      if (
        error instanceof FirebaseError &&
        (error.code === "auth/operation-not-allowed" ||
          error.code === "auth/admin-restricted-operation")
      ) {
        setGuestSetupHelp(true);
      } else {
        toast.error(getErrorMessage(error));
      }
    } finally {
      setPending(false);
    }
  };

  if (loading) {
    return null;
  }

  if (user) {
    return (
      <>
        <Button
          asChild
          className="h-12 w-full bg-white px-8 text-base font-medium text-[#0A0A0A] shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:opacity-90 sm:w-auto"
        >
          <Link href="/chat">Continue to chat</Link>
        </Button>
        <BlockedDeviceModal
          open={blocked !== null}
          reason={blocked}
          onClose={() => setBlocked(null)}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
        <Button
          type="button"
          onClick={handleSignIn}
          disabled={pending}
          className={cn(
            "h-12 w-full gap-3 rounded-lg border border-[#DADCE0] bg-white px-6 text-base font-medium text-black hover:bg-[#F5F5F5] disabled:opacity-70 sm:w-auto",
            className
          )}
        >
          <GoogleLogo />
          {pending ? "Signing in…" : label}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={handleGuestSignIn}
          disabled={pending}
          className="h-12 w-full gap-3 rounded-lg border border-white/15 bg-white/5 px-6 text-base font-medium text-white backdrop-blur-xl hover:bg-white/10 disabled:opacity-70 sm:w-auto dark:border-white/20"
        >
          <UserIcon className="size-4.5" />
          Continue as guest
        </Button>
      </div>
      <BlockedDeviceModal
        open={blocked !== null}
        reason={blocked}
        onClose={() => setBlocked(null)}
      />
      {guestSetupHelp ? (
        <div className="mt-4 max-w-md rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-left">
          <p className="text-sm font-medium text-amber-200">
            Guest mode needs one switch in Firebase
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-white/80">
            <li>Open <b>Firebase Console</b> for project <code>remembr-sbs</code></li>
            <li>Go to <b>Authentication → Sign-in method</b></li>
            <li>Enable <b>Anonymous</b> and click <b>Save</b></li>
            <li>Refresh this page and try again</li>
          </ol>
          <a
            href="https://console.firebase.google.com/project/remembr-sbs/authentication/providers"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
          >
            Open Firebase Console
          </a>
        </div>
      ) : null}
    </>
  );
}
