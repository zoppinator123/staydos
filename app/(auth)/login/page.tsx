"use client";

import { Suspense, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialError = searchParams.get("authError");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(initialError);
  const [pending, startTransition] = useTransition();
  const [googlePending, setGooglePending] = useState(false);

  function submit() {
    setError(null);
    startTransition(async () => {
      const sb = createClient();

      // Enforce @stayd.co domain on direct email/password signup too.
      if (mode === "signup" && !email.toLowerCase().endsWith("@stayd.co")) {
        setError("Sign-up is restricted to @stayd.co accounts.");
        return;
      }

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

  async function signInWithGoogle() {
    setError(null);
    setGooglePending(true);
    const sb = createClient();
    const redirectParam = searchParams.get("redirect") || "/work";
    const callback = new URL("/api/auth/callback", window.location.origin);
    callback.searchParams.set("next", redirectParam);

    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callback.toString(),
        queryParams: {
          // Restrict Google's account picker to stayd.co tenant.
          hd: "stayd.co",
          // Always show the chooser so users don't get auto-signed into the
          // wrong Google account.
          prompt: "select_account",
        },
      },
    });

    if (error) {
      setError(error.message);
      setGooglePending(false);
    }
    // On success Supabase navigates the browser to Google; no further action.
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <h1 className="mb-1 text-lg font-semibold">Staydos</h1>
        <p className="mb-5 text-sm text-zinc-600 dark:text-zinc-400">
          {mode === "signin" ? "Sign in to continue." : "Create your account."}
        </p>

        <Button
          onClick={signInWithGoogle}
          disabled={googlePending}
          variant="secondary"
          className="mb-4 w-full"
        >
          <GoogleIcon />
          <span className="ml-2">
            {googlePending ? "Redirecting…" : "Continue with Google"}
          </span>
        </Button>

        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          <span className="text-xs text-zinc-500">or with email</span>
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        </div>

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
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
            }}
            className="w-full text-xs text-zinc-500 hover:underline"
          >
            {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
          </button>
        </div>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={16}
      height={16}
      className="inline-block"
    >
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.44c-.28 1.48-1.12 2.73-2.39 3.57v2.97h3.86c2.26-2.09 3.58-5.17 3.58-8.78z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.92l-3.86-2.97c-1.07.72-2.44 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.31c-.24-.72-.38-1.49-.38-2.31s.14-1.59.38-2.31V6.6H1.29A11.99 11.99 0 0 0 0 12c0 1.94.46 3.78 1.29 5.4l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.6l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}
