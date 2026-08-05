"use client";

import { ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

import GoogleSignIn from "@/components/GoogleSignIn";
import { generateFingerprint } from "@/lib/fingerprint";

export default function SignupPage() {
  const [deviceUsed, setDeviceUsed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const fingerprint = await generateFingerprint();
        if (!fingerprint) return;
        const response = await fetch("/api/fingerprint/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fingerprint }),
        });
        const data = (await response.json()) as { eligible?: boolean };
        if (!cancelled && data?.eligible === false) {
          setDeviceUsed(true);
        }
      } catch {
        /* fingerprint check is best-effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-white">
        Create your account
      </h1>
      <p className="max-w-md text-center text-[#A1A1A1]">
        Your memory begins here. Conversations, preferences, and context — all
        remembered.
      </p>

      {deviceUsed && (
        <div className="flex max-w-md flex-col gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-200">
            <ShieldAlert className="size-4 shrink-0" />
            Free trial already used on this device
          </div>
          <p className="text-xs leading-relaxed text-[#A1A1A1]">
            The free trial on this device has already been used. If this is
            your account, just sign in below — otherwise upgrade to Starter to
            keep using Remembr.
          </p>
        </div>
      )}

      <GoogleSignIn label="Create free account" />
    </main>
  );
}
