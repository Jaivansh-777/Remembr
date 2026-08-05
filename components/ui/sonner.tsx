"use client"

import { Toaster as SonnerToaster } from "sonner"

export function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      position="top-center"
      richColors
      closeButton
      toastOptions={{
        style: {
          background: "#1A0A2E",
          border: "1px solid rgba(124, 58, 237, 0.3)",
          color: "#FFFFFF",
        },
      }}
    />
  )
}
