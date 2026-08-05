"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth-context";
import {
  billingSchema,
  type BillingFormValues,
  type PlanId,
} from "@/lib/validations/payment";
import { cn } from "@/lib/utils";

export interface CreatedPayment {
  paymentId: string;
  amount: number;
  plan: PlanId;
}

interface BillingFormProps {
  plan: PlanId;
  onPaymentCreated: (payment: CreatedPayment) => void;
}

export function BillingForm({ plan, onPaymentCreated }: BillingFormProps) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BillingFormValues>({
    resolver: zodResolver(billingSchema),
    defaultValues: {
      fullName: user?.displayName ?? "",
      mobileNumber: user?.phoneNumber?.replace(/[^\d]/g, "") ?? "",
    },
  });

  const onSubmit = async (values: BillingFormValues) => {
    if (!user) {
      toast.error("You need to sign in first.");
      return;
    }
    setSubmitting(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...values, plan }),
      });
      const data = (await response.json()) as {
        paymentId?: string;
        amount?: number;
        error?: string;
      };
      if (!response.ok || !data.paymentId) {
        throw new Error(data.error ?? "Could not start payment");
      }
      onPaymentCreated({
        paymentId: data.paymentId,
        amount: data.amount ?? 0,
        plan,
      });
    } catch (error) {
      console.error("[BillingForm] failed:", error);
      toast.error(error instanceof Error ? error.message : "Payment setup failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "h-10 w-full rounded-xl border border-white/10 bg-[#1A1A1A] px-3 text-sm text-white outline-none transition-colors placeholder:text-[#6B6B6B] focus:border-white/40";

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-[#A1A1A1]">
          Full name <span className="text-white">*</span>
        </span>
        <input
          {...register("fullName")}
          className={cn(inputClass, errors.fullName && "border-red-500/60")}
          placeholder="Your full name"
          autoComplete="name"
        />
        {errors.fullName && (
          <span className="text-xs text-red-400">{errors.fullName.message}</span>
        )}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-[#A1A1A1]">
          Delivery address <span className="text-white">*</span>
        </span>
        <textarea
          {...register("address")}
          rows={3}
          className={cn(
            "resize-none rounded-xl border border-white/10 bg-[#1A1A1A] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-[#6B6B6B] focus:border-white/40",
            errors.address && "border-red-500/60"
          )}
          placeholder="House, street, area, city, state"
          autoComplete="street-address"
        />
        {errors.address && (
          <span className="text-xs text-red-400">{errors.address.message}</span>
        )}
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[#A1A1A1]">
            Pincode <span className="text-white">*</span>
          </span>
          <input
            {...register("pincode")}
            className={cn(inputClass, errors.pincode && "border-red-500/60")}
            placeholder="6-digit pincode"
            inputMode="numeric"
            maxLength={6}
            autoComplete="postal-code"
          />
          {errors.pincode && (
            <span className="text-xs text-red-400">{errors.pincode.message}</span>
          )}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[#A1A1A1]">
            Mobile number <span className="text-white">*</span>
          </span>
          <input
            {...register("mobileNumber")}
            className={cn(inputClass, errors.mobileNumber && "border-red-500/60")}
            placeholder="10-digit mobile number"
            inputMode="numeric"
            maxLength={10}
            autoComplete="tel-national"
          />
          {errors.mobileNumber && (
            <span className="text-xs text-red-400">
              {errors.mobileNumber.message}
            </span>
          )}
        </label>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#0A0A0A] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting && <Loader2 className="size-4 animate-spin" />}
        {submitting ? "Setting up payment…" : "Continue to payment"}
      </button>
    </form>
  );
}
