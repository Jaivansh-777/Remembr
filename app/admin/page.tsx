"use client";

import { BellRing, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { PaymentNotification } from "@/components/admin/PaymentNotification";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { toPaymentDoc, type PaymentDoc } from "@/lib/payments";
import { CURRENCY } from "@/lib/validations/payment";

type LoadState = "loading" | "ready" | "forbidden" | "unconfigured" | "error";

const POLL_INTERVAL_MS = 5000;

function AdminContent() {
  const { user } = useAuth();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [payments, setPayments] = useState<PaymentDoc[]>([]);
  const [acting, setActing] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/payments/admin/list", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 503) {
        setLoadState("unconfigured");
        return;
      }
      if (response.status === 403) {
        setLoadState("forbidden");
        return;
      }
      if (!response.ok) {
        setLoadState("error");
        return;
      }
      const data = (await response.json()) as { payments?: Array<Record<string, unknown>> };
      setPayments(
        (data.payments ?? []).map((p) =>
          toPaymentDoc(String(p.id), p as Record<string, unknown>)
        )
      );
      setLoadState("ready");
    } catch (error) {
      console.error("[admin] list failed:", error);
      setLoadState("error");
    }
  }, [user]);

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const interval = setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [load]);

  const review = useCallback(
    async (paymentId: string, action: "verify" | "reject") => {
      if (!user) return;
      setActing((prev) => new Set(prev).add(paymentId));
      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/payments/verify/${paymentId}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action }),
        });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(data.error ?? "Could not review payment");
        }
        toast.success(
          action === "verify"
            ? "Payment verified — user upgraded to Pro"
            : "Payment rejected"
        );
        await load();
      } catch (error) {
        console.error("[admin] review failed:", error);
        toast.error(
          error instanceof Error ? error.message : "Review failed. Try again."
        );
      } finally {
        setActing((prev) => {
          const next = new Set(prev);
          next.delete(paymentId);
          return next;
        });
      }
    },
    [user, load]
  );

  const pending = payments.filter((p) => p.status === "pending");
  const recent = payments.filter((p) => p.status !== "pending").slice(0, 10);

  if (loadState === "loading") {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-[#A1A1A1]" />
      </main>
    );
  }

  if (loadState === "forbidden" || loadState === "unconfigured") {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <ShieldAlert className="size-10 text-[#A1A1A1]" />
        <h1 className="text-lg font-semibold text-white">
          {loadState === "forbidden" ? "Access restricted" : "Admin not configured"}
        </h1>
        <p className="text-sm text-[#A1A1A1]">
          {loadState === "forbidden"
            ? "This area is only available to the Remembr admin."
            : "Set the ADMIN_UID environment variable on the server to enable payment verification."}
        </p>
      </main>
    );
  }

  if (loadState === "error") {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <ShieldAlert className="size-10 text-[#A1A1A1]" />
        <p className="text-sm text-[#A1A1A1]">Could not load payments.</p>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#0A0A0A]"
        >
          Retry
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-white" />
          <h1 className="text-xl font-semibold tracking-tight text-white">
            Admin — Payment verification
          </h1>
        </div>
        <p className="text-sm text-[#A1A1A1]">
          {pending.length} pending payment{pending.length === 1 ? "" : "s"} · refreshing
          every {POLL_INTERVAL_MS / 1000}s
        </p>
      </div>

      {pending.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <BellRing className="size-4 text-white" />
            <h2 className="text-sm font-semibold text-white">
              New payments awaiting verification
            </h2>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-[#A1A1A1]">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Received</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-white/5 last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{payment.fullName || "—"}</p>
                      <p className="font-mono text-xs text-[#A1A1A1]">
                        {payment.id.slice(0, 8)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white">{payment.userEmail || "—"}</p>
                      <p className="text-xs text-[#A1A1A1]">{payment.mobileNumber}</p>
                    </td>
                    <td className="px-4 py-3 text-white">{payment.planLabel}</td>
                    <td className="px-4 py-3 text-white">
                      {CURRENCY} {payment.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-[#A1A1A1]">
                      {payment.createdAt
                        ? new Date(payment.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={acting.has(payment.id)}
                          onClick={() => void review(payment.id, "verify")}
                          className="flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#0A0A0A] transition-opacity hover:opacity-90 disabled:opacity-40"
                        >
                          {acting.has(payment.id) && (
                            <Loader2 className="size-3 animate-spin" />
                          )}
                          YES
                        </button>
                        <button
                          type="button"
                          disabled={acting.has(payment.id)}
                          onClick={() => void review(payment.id, "reject")}
                          className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-40"
                        >
                          NO
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {pending.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/5 p-10 text-center">
          <BellRing className="size-6 text-[#A1A1A1]" />
          <p className="text-sm text-[#A1A1A1]">
            No pending payments. You&apos;ll hear a chime when a new one arrives.
          </p>
        </div>
      )}

      {recent.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-white">Recently processed</h2>
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-[#A1A1A1]">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Processed</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-white/5 last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{payment.fullName || "—"}</p>
                      <p className="font-mono text-xs text-[#A1A1A1]">
                        {payment.id.slice(0, 8)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-white">{payment.planLabel}</td>
                    <td className="px-4 py-3 text-white">
                      {CURRENCY} {payment.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          payment.status === "verified"
                            ? "rounded-full bg-white/15 px-2 py-0.5 text-xs font-medium text-white"
                            : "rounded-full border border-white/10 px-2 py-0.5 text-xs font-medium text-[#A1A1A1]"
                        }
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#A1A1A1]">
                      {payment.updatedAt
                        ? new Date(payment.updatedAt).toLocaleString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <PaymentNotification pendingIds={pending.map((p) => p.id)} />
    </main>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute>
      <AdminContent />
    </ProtectedRoute>
  );
}
