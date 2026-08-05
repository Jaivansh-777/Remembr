"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  auth,
  getRedirectResult,
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
} from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

interface GoogleSignInProps {
  className?: string;
  label?: string;
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
    }
  }
  return "Something went wrong. Please try again.";
}

export default function GoogleSignIn({
  className,
  label = "Sign in with Google",
}: GoogleSignInProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!auth) return;
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          router.replace("/chat");
        }
      })
      .catch((error: unknown) => {
        toast.error(getErrorMessage(error));
      });
  }, [router]);

  const handleSignIn = async () => {
    if (!auth) {
      toast.error("Firebase is not configured. Check environment variables.");
      return;
    }
    setPending(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        router.push("/chat");
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

  if (loading) {
    return null;
  }

  if (user) {
    return (
      <Button
        asChild
        className="h-12 w-full bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] px-8 text-base font-medium text-white shadow-[0_0_30px_rgba(124,58,237,0.45)] hover:opacity-90 sm:w-auto"
      >
        <Link href="/chat">Continue to chat</Link>
      </Button>
    );
  }

  return (
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
  );
}
