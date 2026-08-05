"use client"

/* eslint-disable @next/next/no-img-element */

import Link from "next/link"
import clsx from "clsx"
import {
  Brain,
  Gem,
  LinkIcon,
  Smile,
  Sparkles,
  Triangle,
  Waves,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import GoogleSignIn from "@/components/GoogleSignIn"

type Logo = {
  name: string
  url?: string
  icon: LucideIcon
}

const logos: Logo[] = [
  { name: "OpenAI", icon: Sparkles },
  {
    name: "Anthropic",
    url: "https://cdn.simpleicons.org/anthropic",
    icon: Brain,
  },
  {
    name: "Google Gemini",
    url: "https://cdn.simpleicons.org/googlegemini",
    icon: Gem,
  },
  { name: "Groq", icon: Zap },
  { name: "Mistral", url: "https://cdn.simpleicons.org/mistralai", icon: Wind },
  {
    name: "Hugging Face",
    url: "https://cdn.simpleicons.org/huggingface",
    icon: Smile,
  },
  { name: "LangChain", url: "https://cdn.simpleicons.org/langchain", icon: LinkIcon },
  { name: "Vercel", url: "https://cdn.simpleicons.org/vercel", icon: Triangle },
  { name: "Next.js", url: "https://cdn.simpleicons.org/nextdotjs", icon: Waves },
]

const memoryNodes = [
  { top: "12%", left: "8%", size: "h-1.5 w-1.5", delay: "0s", color: "bg-[#7C3AED]" },
  { top: "22%", left: "86%", size: "h-2 w-2", delay: "0.8s", color: "bg-[#4F46E5]" },
  { top: "38%", left: "14%", size: "h-1 w-1", delay: "1.6s", color: "bg-[#6D28D9]" },
  { top: "56%", left: "90%", size: "h-1.5 w-1.5", delay: "2.4s", color: "bg-[#7C3AED]" },
  { top: "70%", left: "5%", size: "h-2 w-2", delay: "3.2s", color: "bg-[#4F46E5]" },
  { top: "30%", left: "55%", size: "h-1 w-1", delay: "1.2s", color: "bg-[#6D28D9]" },
  { top: "80%", left: "78%", size: "h-1.5 w-1.5", delay: "4s", color: "bg-[#7C3AED]" },
]

const RemembrHero = () => {
  return (
    <section
      id="signin"
      className="relative min-h-[calc(100vh-50px)] overflow-hidden bg-[linear-gradient(to_bottom,#faf8ff,#ece7fb_40%,#d6cbf2_74%,#b79ae8_88%)] dark:bg-[linear-gradient(to_bottom,#0a0a0a,#1a0a2e_40%,#2d1b69_74%,#6d28d9_88%)]"
    >
      <div className="absolute left-1/2 top-[calc(100%-90px)] lg:top-[calc(100%-150px)] h-[500px] w-[700px] md:h-[500px] md:w-[1100px] lg:h-[750px] lg:w-full -translate-x-1/2 rounded-[100%] border-[#6D28D9]/40 bg-black bg-[radial-gradient(closest-side,#0a0a0a_82%,#6d28d9)]" />
      <div className="absolute left-0 top-0 z-0 grid h-full w-full grid-cols-[clamp(28px,10vw,120px)_auto_clamp(28px,10vw,120px)] border-b border-white/10">
        <div className="col-span-1 flex h-full items-center justify-center" />
        <div className="col-span-1 flex h-full items-center justify-center border-x border-white/10" />
        <div className="col-span-1 flex h-full items-center justify-center" />
      </div>
      <figure className="pointer-events-none absolute -bottom-[70%] left-1/2 z-0 block aspect-square w-[520px] -translate-x-1/2 rounded-full bg-[#6D28D9]/40 blur-[200px]" />
      <figure className="pointer-events-none absolute left-[4vw] top-[64px] z-20 hidden aspect-square w-[32vw] rounded-full bg-[#1a0a2e]/60 opacity-50 blur-[100px] md:block dark:bg-[#4F46E5]/20" />
      <figure className="pointer-events-none absolute -bottom-[50px] right-[7vw] z-20 hidden aspect-square w-[30vw] rounded-full bg-[#1a0a2e]/60 opacity-50 blur-[100px] md:block dark:bg-[#7C3AED]/20" />

      <div className="pointer-events-none absolute inset-0 z-10">
        {memoryNodes.map((node, i) => (
          <span
            key={i}
            className={clsx(
              "absolute rounded-full animate-pulse",
              node.size,
              node.color
            )}
            style={{ top: node.top, left: node.left, animationDelay: node.delay }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col pt-[35px]">
        <div
          className="animate-drop-in flex flex-col items-center justify-end"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="flex items-center gap-2 border border-b-0 border-white/5 px-4 py-2 dark:border-white/10">
            <p className="text-sm tracking-tight text-[#5b5b5b] dark:text-[#A1A1A1]">
              Memory-first AI — never re-explain yourself again
            </p>
          </div>
        </div>

        <div className="animate-drop-in" style={{ animationDelay: "0.25s" }}>
          <div className="mx-auto flex min-h-[380px] max-w-[92vw] shrink-0 flex-col items-center justify-center gap-4 px-2 py-4 sm:max-w-[80vw] sm:px-10 sm:py-10 lg:px-24">
            <h1 className="text-pretty text-center text-3xl font-medium leading-[1.08] tracking-[-1.44px] text-[#171717] dark:text-white sm:text-4xl md:text-6xl md:leading-[1.05] md:tracking-[-2.16px] lg:text-[clamp(50px,7vw,75px)]">
              <span className="block">the ai which</span>
              <span className="block bg-gradient-to-r from-[#171717] via-[#4F46E5] to-[#7C3AED] bg-clip-text text-transparent dark:from-white dark:via-[#C4B5FD] dark:to-[#8B5CF6]">
                remembr everything
              </span>
            </h1>
            <h2 className="max-w-2xl text-pretty text-center text-base text-[#5b5b5b] dark:text-[#A1A1A1] md:text-lg">
              Chat with an AI that remembers your projects, preferences, and
              conversations — across sessions, forever.
            </h2>

            <div className="mt-2 flex items-center gap-2 rounded-full border border-[#7C3AED]/30 bg-[#7C3AED]/10 px-4 py-1.5 text-sm text-[#6D28D9] backdrop-blur dark:border-[#7C3AED]/40 dark:bg-[#7C3AED]/15 dark:text-[#C4B5FD]">
              <span className="animate-pulse">🧠</span>
              Soulmate Mode — remembers everything
            </div>
          </div>
        </div>

        <div
          className="animate-drop-in flex items-start justify-center px-8 sm:px-24"
          style={{ animationDelay: "0.45s" }}
        >
          <div className="flex w-full max-w-[92vw] flex-col items-center justify-center gap-4 pb-10 sm:max-w-[80vw] md:max-w-[560px]">
            <GoogleSignIn />
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                asChild
                variant="outline"
                className="h-12 w-full border-[#7C3AED]/40 bg-white/5 px-6 text-sm font-medium text-[#171717] backdrop-blur hover:bg-white/10 dark:text-white sm:w-auto"
              >
                <Link href="/signup">Start chatting — it&apos;s free</Link>
              </Button>
              <Button
                size="lg"
                asChild
                variant="ghost"
                className="h-12 w-full px-6 text-sm font-medium text-[#5b5b5b] hover:bg-white/10 dark:text-[#C4B5FD] sm:w-auto"
              >
                <Link href="/demo">See how it works</Link>
              </Button>
            </div>
          </div>
        </div>

        <div
          className="animate-drop-in mx-auto w-full max-w-7xl"
          style={{ animationDelay: "0.65s" }}
        >
          <AnimatedLogoCloud />
        </div>
      </div>
    </section>
  )
}

const AnimatedLogoCloud = () => {
  return (
    <div className="w-full py-12">
      <div className="mx-auto w-full px-4 md:px-8">
        <p className="mb-6 text-center text-sm text-[#5b5b5b] dark:text-[#A1A1A1]">
          Trusted by the AI ecosystem
        </p>
        <div
          className="group relative mt-6 flex gap-6 overflow-hidden p-2"
          style={{
            maskImage:
              "linear-gradient(to left, transparent 0%, black 20%, black 80%, transparent 95%)",
            WebkitMaskImage:
              "linear-gradient(to left, transparent 0%, black 20%, black 80%, transparent 95%)",
          }}
        >
          {[0, 1].map((index) => (
            <div
              key={index}
              className="flex shrink-0 animate-x-slider flex-row justify-around gap-6"
            >
              {logos.map((logo, key) => (
                <div
                  key={key}
                  className="flex flex-none items-center gap-2 opacity-60 transition-opacity duration-300 hover:opacity-100"
                >
                  <span className="relative flex h-6 w-6 items-center justify-center">
                    <logo.icon className="absolute h-5 w-5 text-[#5b5b5b] dark:text-[#A1A1A1]" />
                    {logo.url && (
                      <img
                        src={logo.url}
                        alt={logo.name}
                        loading="lazy"
                        className="relative h-6 w-6 object-contain brightness-0 dark:invert"
                        onError={(e) => {
                          e.currentTarget.style.display = "none"
                        }}
                      />
                    )}
                  </span>
                  <span className="whitespace-nowrap text-sm text-[#5b5b5b] dark:text-[#A1A1A1]">
                    {logo.name}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default RemembrHero
