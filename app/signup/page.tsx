import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-3xl font-semibold tracking-tight">Create your account</h1>
      <p className="max-w-md text-center text-zinc-400">
        Your memory begins here. Conversations, preferences, and context — all
        remembered.
      </p>
      <Button asChild className="bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] hover:opacity-90">
        <Link href="/">Back home</Link>
      </Button>
    </main>
  );
}
