"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    setError(null);
    startTransition(async () => {
      const sb = createClient();
      const fn = mode === "signin" ? sb.auth.signInWithPassword : sb.auth.signUp;
      const { error } = await fn.call(sb.auth, { email, password });
      if (error) {
        setError(error.message);
        return;
      }
      router.push("/work");
      router.refresh();
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <h1 className="mb-1 text-lg font-semibold">Staydos</h1>
        <p className="mb-5 text-sm text-zinc-600 dark:text-zinc-400">
          {mode === "signin" ? "Sign in to continue." : "Create your account."}
        </p>
        <div className="space-y-3">
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label>Password</Label>
            <Input
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <Button onClick={submit} disabled={pending} className="w-full">
            {pending
              ? mode === "signin"
                ? "Signing in…"
                : "Creating…"
              : mode === "signin"
                ? "Sign in"
                : "Sign up"}
          </Button>
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full text-xs text-zinc-500 hover:underline"
          >
            {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
          </button>
        </div>
      </div>
    </main>
  );
}
