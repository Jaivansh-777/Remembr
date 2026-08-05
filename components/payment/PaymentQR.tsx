"use client";

import { Check, Copy, Smartphone } from "lucide-react";
import { useState } from "react";

import { CURRENCY } from "@/lib/validations/payment";
import { cn } from "@/lib/utils";

interface PaymentQRProps {
  upiId: string;
  amount: number;
  note: string;
  payeeName?: string;
  qrImage?: string;
  className?: string;
  onPaid?: () => void;
}

export function PaymentQR({
  upiId,
  amount,
  note,
  payeeName = "Remembr",
  qrImage = "/upi-qr.png",
  className,
  onPaid,
}: PaymentQRProps) {
  const [copied, setCopied] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable; silently ignore.
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-5 rounded-2xl border border-white/10 bg-white/5 p-6",
        className
      )}
    >
      <div className="flex flex-col items-center gap-1 text-center">
        <h3 className="text-sm font-semibold text-white">Scan to pay with any UPI app</h3>
        <p className="text-xs text-[#A1A1A1]">
          Pay {CURRENCY} {amount.toLocaleString("en-IN")} to <span className="text-white">{upiId}</span>
        </p>
        <p className="text-xs text-[#A1A1A1]">
          {payeeName}
          {note ? ` · ${note}` : ""}
        </p>
      </div>

      {imageFailed ? (
        <div className="flex size-60 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-center text-xs text-[#A1A1A1]">
          QR image unavailable — pay {CURRENCY} {amount.toLocaleString("en-IN")} to{" "}
          <span className="font-medium text-white">{upiId}</span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qrImage}
          alt={`UPI QR code for ${upiId}`}
          onError={() => setImageFailed(true)}
          className="size-60 rounded-xl border border-white/10 bg-white p-2 object-contain"
        />
      )}

      <div className="flex w-full flex-col gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "UPI ID copied" : `Copy UPI ID · ${upiId}`}
        </button>
        <button
          type="button"
          onClick={onPaid}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-[#0A0A0A] transition-colors hover:bg-white/80"
        >
          <Smartphone className="size-4" />
          I&apos;ve Made the Payment
        </button>
      </div>

      <ol className="w-full space-y-1 text-left text-xs text-[#A1A1A1]">
        <li>1. Open any UPI app (GPay, PhonePe, Paytm).</li>
        <li>2. Scan the QR and pay {CURRENCY} {amount.toLocaleString("en-IN")}.</li>
        <li>3. Tap &ldquo;I&apos;ve Made the Payment&rdquo; to confirm.</li>
      </ol>
    </div>
  );
}
