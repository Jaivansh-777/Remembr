"use client";

import { useEffect, useRef } from "react";

interface PaymentNotificationProps {
  /** Full payment list (all statuses) so recently-arrived pendings can be detected. */
  pendingIds: string[];
}

function playChime() {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctor();
    const now = ctx.currentTime;
    const notes = [880, 1174.66, 1567.98];
    notes.forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = frequency;
      const start = now + index * 0.16;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
      osc.start(start);
      osc.stop(start + 0.2);
    });
  } catch (error) {
    console.warn("[PaymentNotification] audio unavailable:", error);
  }
}

function showBrowserNotification(paymentId: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  const notify = () =>
    new Notification("New payment to verify", {
      body: `Payment ${paymentId.slice(0, 8)}… is waiting on /admin`,
      tag: `remembr-payment-${paymentId}`,
    });
  if (Notification.permission === "granted") {
    notify();
  } else if (Notification.permission !== "denied") {
    void Notification.requestPermission().then((permission) => {
      if (permission === "granted") notify();
    });
  }
}

/**
 * Watches the pending payment list and fires an audible chime + a browser
 * notification the moment a new payment arrives, so the admin never misses one.
 */
export function PaymentNotification({ pendingIds }: PaymentNotificationProps) {
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (pendingIds.length === 0) return;
    const fresh = pendingIds.filter((id) => !seenRef.current.has(id));
    if (fresh.length === 0) return;
    fresh.forEach((id) => seenRef.current.add(id));
    playChime();
    showBrowserNotification(fresh[0]);
  }, [pendingIds]);

  return null;
}
