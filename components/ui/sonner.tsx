"use client"

import { Toaster as SonnerToaster } from "sonner"

export function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      position="top-center"
      closeButton
      toastOptions={{
        style: {
          background: "rgba(20, 20, 20, 0.7)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow:
            "0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.04)",
          color: "#FFFFFF",
          borderRadius: "1rem",
        },
      }}
    />
  )
}
