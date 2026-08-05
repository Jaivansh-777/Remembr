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
  { top: "12%", left: "8%", size: "h-1.5 w-1.5", delay: "0s", color: "bg-white/80" },
  { top: "22%", left: "86%", size: "h-2 w-2", delay: "0.8s", color: "bg-white/50" },
  { top: "38%", left: "14%", size: "h-1 w-1", delay: "1.6s", color: "bg-[#A1A1A1]" },
  { top: "56%", left: "90%", size: "h-1.5 w-1.5", delay: "2.4s", color: "bg-white/80" },
  { top: "70%", left: "5%", size: "h-2 w-2", delay: "3.2s", color: "bg-white/50" },
  { top: "30%", left: "55%", size: "h-1 w-1", delay: "1.2s", color: "bg-[#A1A1A1]" },
  { top: "80%", left: "78%", size: "h-1.5 w-1.5", delay: "4s", color: "bg-white/80" },
]

const RemembrHero = () => {
  return (
    <section
      id="signin"
      className="relative min-h-[calc(100vh-50px)] overflow-hidden bg-[linear-gradient(to_bottom,#fafafa,#f4f4f4_40%,#e8e8e8_74%,#d4d4d4_88%)] dark:bg-[linear-gradient(to_bottom,#0a0a0a,#141414_40%,#1f1f1f_74%,#2b2b2b_88%)]"
    >
      <div className="absolute left-1/2 top-[calc(100%-90px)] lg:top-[calc(100%-150px)] h-[500px] w-[700px] md:h-[500px] md:w-[1100px] lg:h-[750px] lg:w-full -translate-x-1/2 rounded-[100%] border-white/10 bg-black bg-[radial-gradient(closest-side,#0a0a0a_82%,#ffffff)]" />
      <div className="absolute left-0 top-0 z-0 grid h-full w-full grid-cols-[clamp(28px,10vw,120px)_auto_clamp(28px,10vw,120px)]">
        <div className="col-span-1 flex h-full items-center justify-center" />
        <div className="col-span-1 flex h-full items-center justify-center border-x border-white/10" />
        <div className="col-span-1 flex h-full items-center justify-center" />
      </div>
      <figure className="pointer-events-none absolute -bottom-[70%] left-1/2 z-0 block aspect-square w-[520px] -translate-x-1/2 rounded-full bg-white/10 blur-[200px]" />
      <figure className="pointer-events-none absolute left-[4vw] top-[64px] z-20 hidden aspect-square w-[32vw] rounded-full bg-black/40 opacity-50 blur-[100px] md:block dark:bg-white/10" />
      <figure className="pointer-events-none absolute -bottom-[50px] right-[7vw] z-20 hidden aspect-square w-[30vw] rounded-full bg-black/40 opacity-50 blur-[100px] md:block dark:bg-white/10" />

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
          <div className="flex items-center gap-2 border border-b-0 border-white/5 px-5 py-2.5 dark:border-white/10">
            <p className="text-base tracking-tight text-[#5b5b5b] dark:text-[#A1A1A1]">
              Memory-first AI — never re-explain yourself again
            </p>
          </div>
        </div>

        <div className="animate-drop-in" style={{ animationDelay: "0.25s" }}>
          <div className="mx-auto flex min-h-[440px] max-w-[92vw] shrink-0 flex-col items-center justify-center gap-6 px-2 py-4 sm:max-w-[80vw] sm:px-10 sm:py-10 lg:px-24">
            <h1 className="text-pretty text-center text-4xl font-medium leading-[1.08] tracking-[-1.44px] text-[#171717] dark:text-white sm:text-5xl md:text-7xl md:leading-[1.05] md:tracking-[-2.16px] lg:text-[clamp(64px,9vw,96px)]">
              <span className="block">the ai which</span>
              <span className="block bg-gradient-to-r from-[#171717] via-[#525252] to-[#171717] bg-clip-text text-transparent dark:from-white dark:via-[#D4D4D4] dark:to-[#A3A3A3]">
                remembr everything
              </span>
            </h1>
            <h2 className="max-w-3xl text-pretty text-center text-lg text-[#5b5b5b] dark:text-[#A1A1A1] md:text-xl">
              Chat with an AI that remembers your projects, preferences, and
              conversations — across sessions, forever.
            </h2>

            <div className="mt-2 flex items-center gap-2.5 rounded-full border border-white/15 bg-white/10 px-5 py-2 text-base text-[#A1A1A1] backdrop-blur-xl dark:border-white/20 dark:bg-white/10 dark:text-white">
              <span className="animate-pulse">🧠</span>
              Soulmate Mode — remembers everything
            </div>
          </div>
        </div>

        <div
          className="animate-drop-in flex items-start justify-center px-8 sm:px-24"
          style={{ animationDelay: "0.45s" }}
        >
          <div className="flex w-full max-w-[92vw] flex-col items-center justify-center gap-4 pb-10 sm:max-w-[80vw] md:max-w-[640px]">
            <div className="flex flex-col gap-4 sm:flex-row">
              <GoogleSignIn
                label="Start chatting — it&apos;s free"
                className="h-14 w-full border-white/15 bg-white/10 px-8 text-base font-medium text-white backdrop-blur-xl hover:bg-white/20 sm:w-auto"
              />
              <Button
                size="lg"
                asChild
                variant="ghost"
                className="h-14 w-full px-8 text-base font-medium text-[#5b5b5b] hover:bg-white/10 dark:text-[#A1A1A1] sm:w-auto"
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
    <div className="w-full py-16">
      <div className="mx-auto w-full px-4 md:px-8">
        <p className="mb-8 text-center text-base text-[#5b5b5b] dark:text-[#A1A1A1]">
          Trusted by the AI ecosystem
        </p>
        <div
          className="group relative mt-6 flex gap-8 overflow-hidden p-2"
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
              className="flex shrink-0 animate-x-slider flex-row justify-around gap-8"
            >
              {logos.map((logo, key) => (
                <div
                  key={key}
                  className="flex flex-none items-center gap-2.5 opacity-60 transition-opacity duration-300 hover:opacity-100"
                >
                  <span className="relative flex h-7 w-7 items-center justify-center">
                    <logo.icon className="absolute h-6 w-6 text-[#5b5b5b] dark:text-[#A1A1A1]" />
                    {logo.url && (
                      <img
                        src={logo.url}
                        alt={logo.name}
                        loading="lazy"
                        className="relative h-7 w-7 object-contain brightness-0 dark:invert"
                        onError={(e) => {
                          e.currentTarget.style.display = "none"
                        }}
                      />
                    )}
                  </span>
                  <span className="whitespace-nowrap text-base text-[#5b5b5b] dark:text-[#A1A1A1]">
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
